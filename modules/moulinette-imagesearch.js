import { MoulinetteSearchResult } from "./moulinette-searchresult.js"

/**
 * Forge Module for image search
 */
export class MoulinetteImageSearch extends game.moulinette.applications.MoulinetteForgeModule {

  static SEARCH_BING_API = "https://api.bing.microsoft.com/v7.0/images/search"
  static SEARCH_GOOGLE_API = "https://customsearch.googleapis.com/customsearch/v1"
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
    this.assetsPacks.push({ idx: 3, special:"google", publisher: "Google Search", pubWebsite: "https://developers.google.com/custom-search/", name: "Google Custom Search v1", url: "https://developers.google.com/custom-search/v1/overview", license: "depends", isRemote: true })
    this.assetsPacks.push({ idx: 1, special:"bing", publisher: "Microsoft Bing", pubWebsite: "https://microsoft.com", name: "Bing Search v7.0", url: "http://bing.com/", license: "depends", isRemote: true })
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
    data.value.forEach( r => results.push({
      src: "Microsoft Bing",
      name: r.name,
      thumb: r.thumbnailUrl,
      url: r.contentUrl,
      page: r.hostPageUrl,
      width: r.width,
      height: r.height,
      format: r.encodingFormat}));
    return results
  }

  /**
  /* Google Search implementation
   */
  async searchGoogle(searchTerms, googleKey, googleCx) {
    // execute search
    const params = new URLSearchParams({
      key: googleKey,
      cx: googleCx,
      q: searchTerms,
      searchType: "image",
      num: 10,
      start: 1,
      filter: 1
    })

    let results = []

    // retrieve 30 results (= 5 requests)
    for(let idx=0; idx<3; idx++) {

      params.set("start", idx * 10 + 1)
      const response = await fetch(`${MoulinetteImageSearch.SEARCH_GOOGLE_API}?${params}`).catch(function(e) {
        console.log(`MoulinetteClient | Cannot establish connection to server ${MoulinetteImageSearch.SEARCH_GOOGLE_API}`, e)
      });

      if( !response || response.status != 200 ) {
        console.error("MoulinetteImageSearch | Invalid response from Google API", response)
        return [];
      }
      let data = await response.json()

      data.items.forEach( r => results.push({
        src: "Google Search",
        name: r.title,
        thumb: r.image.thumbnailLink,
        url: r.link,
        page: r.image.contextLink,
        width: r.image.width,
        height: r.image.height,
        format: r.fileFormat.split("/").pop()}));
    }

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
      page_size: 20
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
      results.push({
        src: "Creative Commons",
        name: r.title,
        thumb: r.thumbnail,
        url: r.url,
        license: r.license,
        licenseUrl: r.license_url,
        page: r.foreign_landing_url,
        noSize: true,
        format: format })
    });
    return results
  }
  
  /**
   * Implements getAssetList
   */
  async getAssetList(searchTerms, packs, publisher) {
    let assets = []
 
    const isBing = publisher == "Microsoft Bing"
    const isGoogle = publisher == "Google Search"
    const isCC = publisher == "Creative Commons"

    // error handling
    const bingKey = game.settings.get("moulinette-imagesearch", "bing-key")
    if( isBing && (!bingKey | bingKey.length == 0)) {
      assets.push(`<div class="error">${game.i18n.localize("mtte.noBingKey")}</div>`)
      return assets;
    }
    const googleKey = game.settings.get("moulinette-imagesearch", "google-key")
    if(isGoogle && (!googleKey | googleKey.length == 0)) {
      assets.push(`<div class="error">${game.i18n.localize("mtte.noGoogleKey")}</div>`)
      return assets;
    }
    const googleEngineId = game.settings.get("moulinette-imagesearch", "google-engine-id")
    if(isGoogle && (!googleEngineId | googleEngineId.length == 0)) {
      assets.push(`<div class="error">${game.i18n.localize("mtte.noGoogleEngine")}</div>`)
      return assets;
    }
    const openverseEnabled = game.settings.get("moulinette-imagesearch", "openverse-enabled")
    if(isCC && !openverseEnabled) {
      assets.push(`<div class="error">${game.i18n.localize("mtte.openverseDisabled")}</div>`)
      return assets;
    }
    
    if(!searchTerms || searchTerms.length == 0) {
      return []
    }
    
    console.log("Moulinette ImageSearch | Searching images... " + searchTerms)
    
    this.searchResults = []
    if((!publisher || isBing) && bingKey && bingKey.length > 0) {
      this.searchResults.push(...await this.searchBing(searchTerms, bingKey))
    }
    if((!publisher || isGoogle) && googleKey && googleKey.length > 0 && googleEngineId && googleEngineId.length > 0) {
      this.searchResults.push(...await this.searchGoogle(searchTerms, googleKey, googleEngineId))
    }
    if((!publisher || isCC) && openverseEnabled) {
      this.searchResults.push(...await this.searchCC(searchTerms))
    }
    
    this.searchResults.sort((a,b) => 0.5 - Math.random())
    
    let html = ""
    let idx = 0;
    this.searchResults.forEach( r => {
      idx++
      assets.push(`<div class="imageresult draggable" title="${r.name}" data-idx="${idx}"><img width="100" height="100" src="${r.thumb}"/></div>`)
    })

    assets.push(`<div class="text">Hello</div>`)
  
    return assets
  }
  
  /**
   * Footer: Dropmode
   */
  async getFooter() {
    return `<div id="footerTiles"></div>`
  }

  /**
   * Updates the footer
   */
  async updateFooter() {

    // prepare the list of macros
    const mode = game.settings.get("moulinette", "tileMode")
    const macroCfg = game.settings.get("moulinette", "tileMacros")[mode] // should return a list of _ids
    const compendium = game.settings.get("moulinette-tiles", "macroCompendium")
    const macroIndex = compendium ? game.packs.get(compendium)?.index.values() : null
    const macros = macroIndex ? Array.from(macroIndex).filter(m => macroCfg && macroCfg.includes(m._id)) : []

    let macroText = "-"
    if( macros.length == 1) {
      macroText = macros[0].name
    }
    else if( macros.length > 1) {
      macroText = game.i18n.format("mtte.multiplesMacros", { count: macros.length})
    }

    const html = await renderTemplate("modules/moulinette-tiles/templates/search-footer.hbs", {
      tileSize: game.settings.get("moulinette", "tileSize"),
      dropAsTile: mode == "tile",
      dropAsArticle: mode == "article",
      dropAsActor: mode == "actor",
      macros: macroText
    })
    this.html.find("#footerTiles").html(html)

    // dropmode listener
    this.html.find(".dropMode").click(event => {
      // callback function for appying the results
      const parent = this
      const callback = async function (mode) {
        mode = ["tile","article","actor"].includes(mode) ? mode : "tile"
        await game.settings.set("moulinette", "tileMode", mode)
        await parent.updateFooter()
      }

      const dialog = new game.moulinette.applications.MoulinetteOptions("dropmode", callback, { width: 100, height: "auto" })
      dialog.position.left = event.pageX - dialog.position.width/2
      dialog.position.top = event.pageY - 60 // is auto
      dialog.render(true)
    })

    // tilesize listener
    this.html.find(".tileSize").click(event => {
      // callback function for appying the results
      const parent = this
      const callback = async function (size) {
        await game.settings.set("moulinette", "tileSize", Number(size))
        await parent.updateFooter()
      }

      const dialog = new game.moulinette.applications.MoulinetteOptions("tilesize", callback, { width: 250, height: "auto" })
      dialog.position.left = event.pageX - dialog.position.width/2
      dialog.position.top = event.pageY - 100 // is auto
      dialog.render(true)
    })

    // macros listener
    this.html.find(".macros").click(event => {
      // callback function for appying the results
      const parent = this
      const callback = async function (macros) {
        if(macros) {
          const config = game.settings.get("moulinette", "tileMacros")
          config[mode] = macros
          await game.settings.set("moulinette", "tileMacros", config)
          await parent.updateFooter()
        }
      }

      const dialog = new game.moulinette.applications.MoulinetteOptions("macros", callback, { width: 450, height: 400, macros: macros.map(m => m._id) })
      dialog.position.left = event.pageX - dialog.position.width/2
      dialog.position.top = event.pageY - 100 // is auto
      dialog.render(true)
    })
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

    // insert Footer
    this.updateFooter()
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
    const size = game.settings.get("moulinette", "tileSize")
    
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
        tileSize: size
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

      const re = /(?:\.([^.]+))?$/; // regular expression to extract extension
      let ext =  re.exec(text.split("/").pop().split('?')[0])[1]
      ext = ext ? ext : "jpg"
      if(!["png","jpg","jpeg","webp","gif","svg"].includes(ext.toLowerCase())) {
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
