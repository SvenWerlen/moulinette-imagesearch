import { MoulinetteSearchResult } from "./moulinette-searchresult.js"

/**
 * Forge Module for image search
 */
export class MoulinetteImageSearch extends game.moulinette.applications.MoulinetteForgeModule {

  static SEARCH_BING_API = "https://api.bing.microsoft.com/v7.0/images/search"
  static SEARCH_CC_API = "https://api.openverse.engineering/v1/images"
  
  constructor() {
    super()
  }
  
  supportsModes() { return false }
  
  /**
   * Pack lists are Search implementations
   */
  async getPackList() {
    this.assetsPacks = []
    this.assetsPacks.push({ idx: 1, special:"bing", publisher: "Microsoft", pubWebsite: "https://microsoft.com", name: "Bing Search v7.0", url: "http://bing.com/", license: "depends", isRemote: true })
    this.assetsPacks.push({ idx: 2, special:"cc", publisher: "Creative Commons", pubWebsite: "https://opensource.creativecommons.org/", name: "CC Search v1.0", url: "https://opensource.creativecommons.org/archives/cc-search/", license: "depends", isRemote: true })    
    return duplicate(this.assetsPacks)
  }
  
  /**
  /* Bing Search implementation
   */
  async searchBing(searchTerms, bingKey) {
    // execute search
    let header = {
      method: "GET",
      headers: {"Ocp-Apim-Subscription-Key" : bingKey},
    }
    const params = new URLSearchParams({
      q: searchTerms,
      //imageType: "photo",
      count: 150
    })
    
    const response = await fetch(`${MoulinetteImageSearch.SEARCH_BING_API}?${params}`, header).catch(function(e) {
      console.log(`MoulinetteClient | Cannot establish connection to server ${MoulinetteImageSearch.SEARCH_BING_API}`, e)
    });
  
    if( !response || response.status != 200 ) {
      console.error("MoulinetteImageSearch | Invalid response from Bing API", response)
      return [];
    }
    let data = await response.json()
    
    let results = []
    data.value.forEach( r => results.push({ src: "Microsoft Bing", name: r.name, thumb: r.thumbnailUrl, url: r.contentUrl, page: r.hostPageUrl, width: r.width, height: r.height, format: r.encodingFormat}));
    return results
  }
  
  /**
  /* CreativeCommons Search implementation
   */
  async searchCC(searchTerms) {
    // execute search
    let header = {
      method: "GET"
    }
    const params = new URLSearchParams({
      q: searchTerms,
      page_size: 150
    })
    
    const response = await fetch(`${MoulinetteImageSearch.SEARCH_CC_API}/?format=json&${params}`, header).catch(function(e) {
      console.log(`MoulinetteClient | Cannot establish connection to server ${MoulinetteImageSearch.SEARCH_CC_API}`, e)
    });
  
    if( !response || response.status != 200 ) {
      console.error("MoulinetteImageSearch | Invalid response from CreativeCommons API", response)
      return [];
    }
    let data = await response.json()
    
    let results = []
    data.results.forEach( r => {
      const format = r.url.substring(r.url.lastIndexOf(".")+1)
      results.push({ src: "Creative Commons", name: r.title, thumb: r.thumbnail, url: r.url, license: r.license, licenseUrl: r.license_url, page: r.foreign_landing_url, noSize: true, format: format })
    });
    return results
  }
  
  /**
   * Implements getAssetList
   */
  async getAssetList(searchTerms, packId) {
    let assets = []
 
    let pack = packId ? this.assetsPacks.find(p => p.idx == packId) : null
    const bingKey = game.settings.get("moulinette-imagesearch", "bing-key")
    if(pack && pack.special == "bing" && (!bingKey | bingKey.length == 0)) {
      assets.push(`<div class="error">${game.i18n.localize("mtte.noBingKey")}</div>`)
      return assets;
    }
    
    if(!searchTerms || searchTerms.length == 0) {
      return []
    }
    
    console.log("Moulinette ImageSearch | Searching images... " + searchTerms)
    
    this.searchResults = []
    if((!pack || pack.special == "bing") && bingKey && bingKey.length > 0) {
      this.searchResults.push(...await this.searchBing(searchTerms, bingKey))
    }
    if(!pack || pack.special == "cc") {
      this.searchResults.push(...await this.searchCC(searchTerms))
    }
    
    this.searchResults.sort((a,b) => 0.5 - Math.random())
    
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
      const compact = game.settings.get("moulinette-core", "uiMode") == "compact"
      return '<div class="options">' +
        (compact ? "" : `${game.i18n.localize("mtte.dropmode")} <i class="fas fa-question-circle" title="${game.i18n.localize("mtte.dropmodeToolTip")}"></i>`) +
        `<input class="dropmode" type="radio" name="mode" value="tile" ${mode == "tile" ? "checked" : ""}> ${game.i18n.localize("mtte.tile")}
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
          
    const timestamp =  new Date().getTime();
    const image = this.searchResults[idx-1]
    let imageFileName = image.name.replace(/[\W_]+/g,"-").replace(".","")
    imageFileName = (imageFileName.length > 30 ? imageFileName.substring(0, 30) : imageFileName) + "-" + timestamp + "." + image.format
    
    // create fake tile
    const tile = {
      filename: imageFileName, 
      type: "img", 
      sas: "", 
      search: image
    }
    
    let dragData = {}
    if(mode == "tile") {
      dragData = {
        type: "Tile",
        tile: tile,
        pack: { publisher: image.src, name: "Results" },
        tileSize: 100
      };
    } else if(mode == "article") {
      dragData = {
        type: "JournalEntry",
        tile: tile,
        pack: { publisher: image.src, name: "Results" }
      };
    } else if(mode == "actor") {
      dragData = {
        type: "Actor",
        tile: tile,
        pack: { publisher: image.src, name: "Results" }
      };
    }
    
    dragData.source = "mtte"
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }
  
  
  async onShortcut(type) {
    if(type == "paste") {
      let text = ""
      if(navigator.clipboard) {
        text = await navigator.clipboard.readText().catch(err => {
          console.error('Moulinette ImageSearch | Failed to read clipboard contents: ', err);
        });
      }
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

      const ext = text.split('.').pop().toLowerCase();
      if(!["png","jpg","jpeg","webp","gif","svg"].includes(ext)) {
        return console.error('Moulinette ImageSearch | Invalid image format from URL: ', text);
      }
      
      const dateAsString = new Date().toLocaleDateString("en-US", { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      const data = {
        custom: true,
        noSize: true,
        name: game.i18n.format("mtte.fromClipboard", { date: dateAsString }),
        page: text,
        thumb: text,
        url: text,
        format: ext,
        src: 'Clipboard',

      }
      new MoulinetteSearchResult(data).render(true)
    }
  }

  async onAction(classList) {
    // ACTION - HELP / HOWTO
    if(classList.contains("howto")) {
      new game.moulinette.applications.MoulinetteHelp("search").render(true)
    }
  }

}
