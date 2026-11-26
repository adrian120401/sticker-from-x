(() => {
  const preferred = (navigator.languages?.length ? navigator.languages : [navigator.language])
    .map(language => language?.toLowerCase().split("-")[0])
    .find(language => language === "es" || language === "en");
  const spanishPath = location.pathname === "/x" ? "/x/es" : "/es";
  if (preferred === "es") location.replace(spanishPath + location.search + location.hash);
})();
