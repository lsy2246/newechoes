export const FUNCTION_ROUTES = [
  {
    route: "douban",
    handlerModule: "src/server/api/douban",
    methods: ["GET"],
  },
  {
    route: "weread",
    handlerModule: "src/server/api/weread",
    methods: ["GET"],
  },
  {
    route: "git-projects",
    handlerModule: "src/server/api/git-projects",
    methods: ["GET", "OPTIONS"],
  },
  {
    route: "google-photos",
    handlerModule: "src/server/api/google-photos",
    methods: ["GET"],
  },
];
