import unittest

from pijao.servicios.gps import Muestreo, calidad_senal


class TestGPS(unittest.TestCase):
    def test_calidad(self):
        self.assertEqual(calidad_senal(5), "buena")
        self.assertEqual(calidad_senal(10), "regular")
        self.assertEqual(calidad_senal(20), "regular")
        self.assertEqual(calidad_senal(21), "débil")
        self.assertEqual(calidad_senal(None), "sin señal")

    def test_muestreo_mejor_y_tiempo(self):
        t = [0.0]
        m = Muestreo(9, reloj=lambda: t[0])
        self.assertIsNone(m.mejor())
        for p in (30, 12, 18):
            m.agregar({"lat": 4.3, "lng": -75.7, "precision_m": p})
        m.agregar({"lat": None, "lng": None, "precision_m": 1})
        m.agregar({"lat": 4.3, "lng": -75.7, "precision_m": 2, "previa": True})   # ubicación guardada: no cuenta
        self.assertEqual(m.mejor()["precision_m"], 12)
        self.assertFalse(m.terminado)
        t[0] = 9.1
        self.assertTrue(m.terminado)


if __name__ == "__main__":
    unittest.main()
