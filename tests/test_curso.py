import unittest

from pijao.core import curso


class TestCurso(unittest.TestCase):
    def test_contenido(self):
        self.assertEqual(len(curso.LECCIONES), 7)
        self.assertEqual(len(curso.PREGUNTAS), 15)
        for _, ops, ok in curso.PREGUNTAS:
            self.assertEqual(len(ops), 3)
            self.assertIn(ok, (0, 1, 2))

    def test_puntaje(self):
        todas = {i: ok for i, (_, _, ok) in enumerate(curso.PREGUNTAS)}
        self.assertEqual(curso.puntaje(todas), 100)
        self.assertEqual(curso.puntaje({}), 0)
        doce = {i: ok for i, (_, _, ok) in enumerate(curso.PREGUNTAS) if i < 12}
        self.assertEqual(curso.puntaje(doce), 80)
        self.assertTrue(curso.aprobado(80))
        once = {i: ok for i, (_, _, ok) in enumerate(curso.PREGUNTAS) if i < 11}
        self.assertFalse(curso.aprobado(curso.puntaje(once)))


if __name__ == "__main__":
    unittest.main()
