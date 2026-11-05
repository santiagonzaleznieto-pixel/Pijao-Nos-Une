import os
import subprocess
import sys
import unittest

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class TestInterfazEmulada(unittest.TestCase):
    def test_recorrido_completo(self):
        r = subprocess.run([sys.executable, os.path.join(RAIZ, "tools", "probar_ui.py")], capture_output=True, text=True, timeout=120)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("TODO BIEN", r.stdout)

    def test_revision_estatica(self):
        r = subprocess.run([sys.executable, os.path.join(RAIZ, "tools", "revisar_codigo.py")], capture_output=True, text=True, timeout=60)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)


if __name__ == "__main__":
    unittest.main()
