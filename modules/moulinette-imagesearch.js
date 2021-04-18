import { MoulinetteSearchResult } from "./moulinette-searchresult.js"

/**
 * Forge Module for image search
 */
export class MoulinetteImageSearch extends game.moulinette.applications.MoulinetteForgeModule {

  constructor() {
    super()
  }
  
  /**
   * Implements getAssetList
   */
  async getAssetList(searchTerms) {
    let assets = []
    
    if(!searchTerms || searchTerms.length == 0) {
      return []
    }
    
    console.log("Moulinette ImageSearch | Searching images... " +searchTerms)
    
    // execute search
    let client = new game.moulinette.applications.MoulinetteClient()
    let result = await client.post("/search", { query: searchTerms })
    if( result && result.status == 200 ) {
      let html = ""
      this.searchResults = result.data.results;
      let idx = 0;
      result.data.results.forEach( r => {
        idx++
        assets.push(`<div class="imageresult draggable" title="${r.name}" data-idx="${idx}"><img width="100" height="100" src="${r.thumb}"/></div>`)
      })
    }
  
    return assets
  }
  
  /**
   * Footer: Dropmode
   */
  async getFooter() {
    if(game.moulinette.applications.MoulinetteDropAsActor) {
      const mode = game.settings.get("moulinette", "tileMode")
      return `<div class="options">
        ${game.i18n.localize("mtte.dropmode")} <i class="fas fa-question-circle" title="${game.i18n.localize("mtte.dropmodeToolTip")}"></i> 
        <input class="dropmode" type="radio" name="mode" value="tile" ${mode == "tile" ? "checked" : ""}> ${game.i18n.localize("mtte.tile")}
        <input class="dropmode" type="radio" name="mode" value="article" ${mode == "article" ? "checked" : ""}> ${game.i18n.localize("mtte.article")}
        <input class="dropmode" type="radio" name="mode" value="actor" ${mode == "actor" ? "checked" : ""}> ${game.i18n.localize("mtte.actor")}
      </div>`
    } else {
      return `<div class="options"><em>${game.i18n.localize("mtte.dropmodeDisabled")}</em></div>`
    }
  }
  
  
  /**
   * Implements listeners
   */
  activateListeners(html) {
    // keep html for later usage
    this.html = html
    
    // image clicked
    this.html.find(".imageresult").click(this._onClickAction.bind(this))
    
    // when choose mode
    this.html.find(".options input").click(this._onChooseMode.bind(this))
  }
  
  
  async _onClickAction(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const idx = source.dataset.idx;
    
    if(this.searchResults && idx > 0 && idx <= this.searchResults.length) {
      new MoulinetteSearchResult(this.searchResults[idx-1]).render(true)
    }
  }
  
  _onChooseMode(event) {
    const source = event.currentTarget;
    let mode = ["tile","article","actor"].includes(source.value) ? source.value : "tile"
    game.settings.set("moulinette", "tileMode", mode)
  }
  
  /**
   * @INFO Function is inspired from the one in submodule Tiles
   */
  onDragStart(event) {
    // module moulinette-tiles is required for supporting drag/drop
    if(!game.moulinette.applications.MoulinetteDropAsActor) {
      ui.notifications.error(game.i18n.localize("mtte.errorDragDropRequirements"));
      event.preventDefault();
      return;
    }
    
    const div = event.currentTarget;
    const idx = div.dataset.idx;
    const mode = game.settings.get("moulinette", "tileMode")
    
    // invalid action
    if(!this.searchResults || idx < 0 || idx > this.searchResults.length) return
          
    const image = this.searchResults[idx-1]
    const imageName = `${image.name}.${image.format}`
    const filePath = "moulinette/images/search/" + imageName

    // download & upload image
    const headers = { method: "POST", headers: { 'Content-Type': 'application/json'}, body: JSON.stringify({ url: image.url }) }
    fetch(game.moulinette.applications.MoulinetteClient.SERVER_URL + "/search/download", headers).catch(function(e) {
      ui.notifications.error(game.i18n.localize("mtte.errorDownloadTimeout"));
      console.log(`Moulinette | Cannot download image ${image.url}`, e)
      return;
    }).then( res => {
      res.blob().then( blob => game.moulinette.applications.MoulinetteFileUtil.upload(new File([blob], imageName, { type: blob.type, lastModified: new Date() }), imageName, "moulinette/images/", `moulinette/images/search/`, false) )
    });

    let dragData = {}
    if(mode == "tile") {
      dragData = {
        type: "Tile",
        img: filePath,
        tileSize: 100
      };
    } else if(mode == "article") {
      dragData = {
        type: "JournalEntry",
        name: imageName,
        img: filePath
      };
    } else if(mode == "actor") {
      dragData = {
        type: "Actor",
        img: filePath
      };
    }
    
    dragData.source = "mtte"
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }
  
  
  async onShortcut(type) {
    if(type == "paste") {
      let text = await navigator.clipboard.readText().catch(err => {
        console.error('Moulinette ImageSearch | Failed to read clipboard contents: ', err);
      });
      const content = `<p>${game.i18n.localize("mtte.enterImageURLDescription")}</p>
        <div class="form-group"><label><b>${game.i18n.localize("mtte.imageURL")}</b></label>
        <label><input class="imageURL" type="text" name="imageURL" placeholder="https://..."></label></div><br/>`

      if(!text || !text.startsWith("http")) {
        text = await Dialog.prompt({
          title: game.i18n.localize("mtte.enterImageURL"),
          content: content,
          label: game.i18n.localize("mtte.confirm"),
          callback: html => {
            return html.find(".imageURL").val()
            }
        });
      }
      const data = {
        custom: true,
        noSize: true,
        name: game.i18n.localize("mtte.fromClipboard"),
        page: text,
        thumb: text,
        url: text,
      }
      new MoulinetteSearchResult(data).render(true)
    }
  }
  
}
