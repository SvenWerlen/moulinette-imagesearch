import { MoulinetteSearchResult } from "./moulinette-searchresult.js"

/**
 * Forge Module for image search
 */
export class MoulinetteImageSearch extends game.moulinette.applications.MoulinetteForgeModule {

  static SEARCH_API = "https://api.bing.microsoft.com/v7.0/images/search"
  
  constructor() {
    super()
  }
  
  /**
   * Implements getAssetList
   */
  async getAssetList(searchTerms) {
    let assets = []
    
    const bingKey = game.settings.get("moulinette-imagesearch", "bing-key")
    if(!bingKey || bingKey.length == 0) {
      assets.push(`<div class="error">${game.i18n.localize("mtte.noBingKey")}</div>`)
      return assets;
    }
    
    if(!searchTerms || searchTerms.length == 0) {
      return []
    }
    
    console.log("Moulinette ImageSearch | Searching images... " + searchTerms)
    
    // execute search
    let header = {
      method: "GET",
      headers: {"Ocp-Apim-Subscription-Key" : bingKey},
    }
    const params = new URLSearchParams({
      q: searchTerms,
      imageType: "photo",
      count: 150
    })
    
    const response = await fetch(`${MoulinetteImageSearch.SEARCH_API}?${params}`, header).catch(function(e) {
      console.log(`MoulinetteClient | Cannot establish connection to server ${MoulinetteImageSearch.SEARCH_API}`, e)
    });
  
    if( !response || response.status != 200 ) {
      console.error("MoulinetteImageSearch | Invalid response from Bing API", response)
      return assets;
    }
    
    
    let data = await response.json()
    
    this.searchResults = []
    data.value.forEach( r => this.searchResults.push({ name: r.name, thumb: r.thumbnailUrl, url: r.contentUrl, page: r.hostPageUrl, width: r.width, height: r.height, format: r.encodingFormat}));
    
    let html = ""
    let idx = 0;
    this.searchResults.forEach( r => {
      idx++
      assets.push(`<div class="imageresult draggable" title="${r.name}" data-idx="${idx}"><img width="100" height="100" src="${r.thumb}"/></div>`)
    })
  
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
    const imageName = `${image.name}`
    const imageFileName = image.name.replace(/[\W_]+/g,"-").replace(".","") + "." + image.format
    const filePath = game.moulinette.applications.MoulinetteFileUtil.getBaseURL() + "moulinette/images/search/" + imageFileName

    // download & upload image
    const headers = { method: "POST", headers: { 'Content-Type': 'application/json'}, body: JSON.stringify({ url: image.url }) }
    fetch(game.moulinette.applications.MoulinetteClient.SERVER_URL + "/search/download", headers).catch(function(e) {
      ui.notifications.error(game.i18n.localize("mtte.errorDownloadTimeout"));
      console.log(`Moulinette | Cannot download image ${image.url}`, e)
      return;
    }).then( res => {
      res.blob().then( blob => game.moulinette.applications.MoulinetteFileUtil.upload(new File([blob], imageFileName, { type: blob.type, lastModified: new Date() }), imageFileName, "moulinette/images/", `moulinette/images/search/`, false) )
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
      
      const dateAsString = new Date().toLocaleDateString("en-US", { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      const data = {
        custom: true,
        noSize: true,
        name: game.i18n.format("mtte.fromClipboard", { date: dateAsString }),
        page: text,
        thumb: text,
        url: text,
      }
      new MoulinetteSearchResult(data).render(true)
    }
  }
  
}
