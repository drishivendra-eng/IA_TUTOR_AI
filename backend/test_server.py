import os
import unittest
from io import BytesIO
from unittest.mock import patch

from fastapi.testclient import TestClient

try:
    import server
except ModuleNotFoundError:
    from backend import server
try:
    from normalization import normalize_response_payload
except ModuleNotFoundError:
    from backend.normalization import normalize_response_payload


class TestServer(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(server.app)
        os.environ.pop('OPENAI_API_KEY', None)

    def test_health_endpoint(self):
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'ok')

    def test_analyze_drawing_returns_demo_when_key_missing(self):
        png_bytes = b'\x89PNG\r\n\x1a\n' + b'test'
        response = self.client.post(
            '/api/analyze-drawing',
            files={'image': ('sample.png', BytesIO(png_bytes), 'image/png')},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['mode'], 'demo')
        self.assertIn('problem', payload)
        self.assertIn('dimensions', payload['problem'])

    def test_analyze_drawing_rejects_non_image_upload(self):
        response = self.client.post(
            '/api/analyze-drawing',
            files={'image': ('sample.txt', BytesIO(b'hello'), 'text/plain')},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('Unsupported image type', response.json()['detail'])

    def test_analyze_drawing_rejects_empty_image(self):
        response = self.client.post(
            '/api/analyze-drawing',
            files={'image': ('empty.png', BytesIO(b''), 'image/png')},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('empty', response.json()['detail'].lower())

    def test_analyze_drawing_rejects_mismatched_image_content(self):
        response = self.client.post(
            '/api/analyze-drawing',
            files={'image': ('wrong.png', BytesIO(b'not a png'), 'image/png')},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('does not match', response.json()['detail'])

    def test_analyze_drawing_rejects_oversized_image(self):
        oversized_png = b'\x89PNG\r\n\x1a\n' + b'x' * (server.MAX_IMAGE_BYTES + 1)
        response = self.client.post(
            '/api/analyze-drawing',
            files={'image': ('large.png', BytesIO(oversized_png), 'image/png')},
        )

        self.assertEqual(response.status_code, 413)
        self.assertIn('10 MiB', response.json()['detail'])

    @patch.object(server, 'analyze_image_with_openai')
    def test_real_analysis_preserves_uploaded_mime_type(self, analyze_image):
        analyze_image.return_value = {
            'mode': 'real',
            'message': 'REAL AI ANALYSIS',
            'problem': server.build_demo_response().problem.model_dump(),
            'requires_confirmation': False,
        }
        os.environ['OPENAI_API_KEY'] = 'configured-for-test'
        jpeg_bytes = b'\xff\xd8\xff' + b'test'

        response = self.client.post(
            '/api/analyze-drawing',
            files={'image': ('sample.jpg', BytesIO(jpeg_bytes), 'image/jpeg')},
        )

        self.assertEqual(response.status_code, 200)
        analyze_image.assert_called_once_with(
            jpeg_bytes,
            'sample.jpg',
            'image/jpeg',
            'configured-for-test',
        )

    def test_demo_response_is_schema_validated(self):
        jpeg_bytes = b'\xff\xd8\xff' + b'test'
        response = self.client.post(
            '/api/analyze-drawing',
            files={'image': ('sample.jpeg', BytesIO(jpeg_bytes), 'image/jpeg')},
        )

        self.assertEqual(response.status_code, 200)
        server.DrawingProblemResponse.model_validate(response.json())

    def test_normalizes_structured_vision_fields_before_validation(self):
        payload = normalize_response_payload({
            'mode': 'real',
            'problem': {
                'drawing_type': 'technical drawing',
                'projection_type': 'orthographic',
                'units': 'mm',
                'scale': None,
                'overall_dimensions': {'width': 60, 'height': 40, 'depth': None},
                'dimensions': {'width': 60, 'height': 40, 'depth': None},
                'views_required': ['front'],
                'geometric_features': ['rectangle'],
                'surfaces': [],
                'steps': [{'height': 20, 'confidence': 1}],
                'slopes': [{'angle': None, 'confidence': 0.4, 'source': 'not_visible'}],
                'circles': [],
                'arcs': [],
                'construction_requirements': None,
                'difficulty': None,
                'confidence': {
                    'overall': 0.8,
                    'explanation': 'Some values were not visible.',
                },
                'explanation': 'Some values were not visible.',
            },
        })

        response = server.DrawingProblemResponse.model_validate(payload)
        self.assertEqual(response.problem.overall_dimensions['width'].value, 60)
        self.assertEqual(response.problem.overall_dimensions['height'].value, 40)
        self.assertIn('height: 20', response.problem.steps[0])
        self.assertIn('angle: not visible', response.problem.slopes[0])


if __name__ == '__main__':
    unittest.main()
