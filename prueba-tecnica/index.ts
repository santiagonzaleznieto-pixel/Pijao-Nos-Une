import "./src/inicio";          // primero: marca el momento de arranque
import "./src/jornada";         // la tarea de GPS debe existir aunque la app arranque en segundo plano
import { registerRootComponent } from "expo";

import App from "./App";

registerRootComponent(App);
