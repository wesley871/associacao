import express from "express";
import ejs from "ejs";
import router from "./routers/router.js";
import { resolve } from "node:path";
import multer from './utils/multer.js';
import { ensureDefaultAdmin } from "./modules/user/service/user.service.js";
import helmet from "helmet";

const app = express();

ensureDefaultAdmin();

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(resolve("src", "public")));
app.set("view engine", "html");
app.set("views", resolve("src", "views", "pages"));
app.engine(".html", ejs.renderFile);
app.use(multer.single('image'));

app.use(router);

const port = process.env.PORT ?? 3000;

app.listen(port);

export default app;
