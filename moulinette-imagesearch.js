
/**
 * Ready: define new moulinette forge module
 */
Hooks.once("ready", async function () {
  if (game.user.isGM) {
    // create default home folder for game icons
    await game.moulinette.applications.MoulinetteFileUtil.createFolderIfMissing(".", "moulinette");
    await game.moulinette.applications.MoulinetteFileUtil.createFolderIfMissing("moulinette", "moulinette/images");
    await game.moulinette.applications.MoulinetteFileUtil.createFolderIfMissing("moulinette/images", "moulinette/images/search");
    
    const moduleClass = (await import("./modules/moulinette-imagesearch.js")).MoulinetteImageSearch
    game.moulinette.forge.push({
      id: "imagesearch",
      icon: "fas fa-search",
      name: game.i18n.localize("mtte.imageSearch"),
      description: game.i18n.localize("mtte.imageSearchDescription"),
      instance: new moduleClass(),
      actions: [],
      shortcuts: [{
        id: "paste", 
        name: game.i18n.localize("mtte.pasteURL"),
        icon: "fas fa-clipboard"
      }]
    })
    
    console.log("Moulinette ImageSearch | Module loaded")
  }
});
