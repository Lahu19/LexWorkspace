import { app, start } from "../server/src/index";

export default async (req: any, res: any) => {
  await start();
  return app(req, res);
}
