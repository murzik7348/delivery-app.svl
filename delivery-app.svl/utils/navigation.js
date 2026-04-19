export const safeBack = (router) => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
};
