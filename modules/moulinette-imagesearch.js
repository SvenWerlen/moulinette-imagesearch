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
        assets.push(`<div class="imageresult" title="${r.name}" data-idx="${idx}"><img width="100" height="100" src="${r.thumb}"/></div>`)
      })
    }
  
    return assets
  }
  
  
  /**
   * Implements listeners
   */
  activateListeners(html) {
    // keep html for later usage
    this.html = html
    
    // image clicked
    this.html.find(".imageresult").click(this._onClickAction.bind(this))
  }
  
  
  async _onClickAction(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const idx = source.dataset.idx;
    
    if(this.searchResults && idx > 0 && idx <= this.searchResults.length) {
      new MoulinetteSearchResult(this.searchResults[idx-1]).render(true)
    }
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
