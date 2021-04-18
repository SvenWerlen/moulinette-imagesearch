/*************************
 * Search result
 *************************/
export class MoulinetteSearchResult extends FormApplication {
  
  constructor(data) {
    super()
    this.data = data;   
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

    const data = await this._downloadFile()
    if(!data) return;

    // create article if requested
    if(event.submitter.className == "createArticle") {
      ui.journal.activate() // give focus to journal
      const article = await JournalEntry.create( {name: data.name, img: data.filepath} )
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
    this._downloadFile();
    const img = this._getImageDetails();
    
    let dragData = {}
    if(mode == "tile") {
      dragData = {
        type: "Tile",
        img: img.filepath,
        tileSize: 100
      };
    } else if(mode == "article") {
      dragData = {
        type: "JournalEntry",
        name: img.name,
        img: img.filepath
      };
    } else if(mode == "actor") {
      dragData = {
        type: "Actor",
        img: img.filepath
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
  
  _getImageDetails() {
    let imageName = this.data.name
    if(!this.data.format) {
      this.data.format = blob.type.split('/').pop()
    }
    const imageFileName = imageName.replace(/[\W_]+/g,"-") + "." + this.data.format
    return { name: imageName, filename: imageFileName, filepath: "moulinette/images/search/" + imageFileName }
  }
  
  async _downloadFile() {
    // download & upload image
    const headers = { method: "POST", headers: { 'Content-Type': 'application/json'}, body: JSON.stringify({ url: this.data.url }) }
    const res = await fetch(game.moulinette.applications.MoulinetteClient.SERVER_URL + "/search/download", headers).catch(function(e) {
      ui.notifications.error(game.i18n.localize("mtte.errorDownloadTimeout"));
      console.log(`Moulinette | Cannot download image ${svg}`, e)
      return null;
    });
    if(!res) return
    const blob = await res.blob()
    const img = this._getImageDetails()
    
    await game.moulinette.applications.MoulinetteFileUtil.upload(new File([blob], img.filename, { type: blob.type, lastModified: new Date() }), img.filename, "moulinette/images", `moulinette/images/search`, false)
    return img;
  }
  
}
