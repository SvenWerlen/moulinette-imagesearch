
Hooks.once("init", async function () {
  console.log("Moulinette ImageSearch | Init") 
  game.settings.register("moulinette", "tileMode", { scope: "world", config: false, type: String, default: "tile" })
  
  game.settings.register("moulinette-imagesearch", "bing-key", {
    name: game.i18n.localize("mtte.configBingKey"), 
    hint: game.i18n.localize("mtte.configBingKeyHint"), 
    scope: "world",
    config: true,
    default: "",
    type: String
  });
})

/**
 * Ready: define new moulinette forge module
 */
Hooks.once("ready", async function () {
  if (game.user.isGM) {
    // create default home folder for image search
    await game.moulinette.applications.MoulinetteFileUtil.createFolderRecursive("moulinette/images/search");
    
    const moduleClass = (await import("./modules/moulinette-imagesearch.js")).MoulinetteImageSearch
    game.moulinette.forge.push({
      id: "imagesearch",
      layer: "notes",
      icon: "fas fa-search",
      name: game.i18n.localize("mtte.imageSearch"),
      description: game.i18n.localize("mtte.imageSearchDescription"),
      instance: new moduleClass(),
      actions: [
        {id: "howto", icon: "fas fa-question-circle" ,name: game.i18n.localize("mtte.howto"), help: game.i18n.localize("mtte.howtoToolTip") }
      ],
      shortcuts: [{
        id: "paste", 
        name: game.i18n.localize("mtte.pasteURL"),
        icon: "fas fa-clipboard"
      }],
    })
    
    console.log("Moulinette ImageSearch | Module loaded")
  }
});
