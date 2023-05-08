/*************************
 * Search result
 *************************/
export class MoulinetteSearchResult extends FormApplication {
  
  constructor(data) {
    super()
    this.data = data;
    
    const mode = game.settings.get("moulinette", "tileMode")
    const timestamp =  new Date().getTime();
    const image = data
    let imageFileName = image.name.replace(/[\W_]+/g,"-").replace(".","")
    imageFileName = (imageFileName.length > 30 ? imageFileName.substring(0, 30) : imageFileName) + "-" + timestamp + "." + image.format
    
    // create fake tile
    this.tile = {
      filename: imageFileName, 
      type: "img", 
      sas: "", 
      search: image
    }
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-searchresult",
      classes: ["mtte", "searchresult"],
      title: game.i18n.localize("mtte.searchresult"),
      template: "modules/moulinette-imagesearch/templates/searchresult.hbs",
      width: 420,
      height: "auto",
      dragDrop: [{dragSelector: ".imageresult"}],
      closeOnSubmit: true,
      submitOnClose: false,
    });
  }
  
  getData() {
    let domain = (new URL(this.data.page));
    this.data["domain"] = domain.hostname
    return this.data
  }
  
  async _updateObject(event) {
    event.preventDefault();
    
    // Download asset
    const data = { tile: this.tile }
    const cTiles = await import("../../moulinette-tiles/modules/moulinette-tiles.js")
    const folder = await cTiles.MoulinetteTiles.getOrCreateArticleFolder(this.data.src, "Results")
    await cTiles.MoulinetteTiles.downloadAsset(data)
    
    // create article if requested
    if(event.submitter.className == "createArticle") {
      ui.journal.activate() // give focus to journal
      const article = await game.moulinette.applications.Moulinette.generateArticle(this.data.name, data.img, folder._id)
      article.sheet.render(true)
    }
  }
  
  _onDragStart(event) {
    // module moulinette-tiles is required for supporting drag/drop
    if(!game.moulinette.applications.MoulinetteDropAsActor) {
      ui.notifications.error(game.i18n.localize("mtte.errorDragDropRequirements"));
      event.preventDefault();
      return;
    }
    
    const mode = game.settings.get("moulinette", "tileMode")
    
    let dragData = {}
    if(mode == "tile") {
      dragData = {
        type: "Tile",
        tile: this.tile,
        pack: { publisher: this.data.src, name: "Results" },
        tileSize: 100
      };
    } else if(mode == "article") {
      dragData = {
        type: "JournalEntry",
        tile: this.tile,
        pack: { publisher: this.data.src, name: "Results" }
      };
    } else if(mode == "actor") {
      dragData = {
        type: "Actor",
        tile: this.tile,
        pack: { publisher: this.data.src, name: "Results" }
      };
    }
    
    dragData.source = "mtte"
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.bringToTop()
    html.find(".thumb").css('background', `url(${this.data.thumb}) 50% 50% no-repeat`)
  }
  
}
