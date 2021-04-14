/**
 * Forge Module for game icons
 */
export class MoulinetteGameIcons extends game.moulinette.applications.MoulinetteForgeModule {

  constructor() {
    super()
    this.scenes = []
  }
  
  /**
   * Implements getAssetList
   */
  async getAssetList(searchTerms) {
    let assets = []
    
    if(!searchTerms || searchTerms.length == 0) {
      return []
    }
    
    console.log("Moulinette GameIcons | Searching ... " + searchTerms)
    const query = encodeURI(searchTerms)
    const request = { requests: [{
      indexName: "icons",
      hitsPerPage: 50,
      params: `query=${query}&page=0`
    }]}
    
    // execute search
    const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
    const params = "x-algolia-application-id=9HQ1YXUKVC&x-algolia-api-key=fa437c6f1fcba0f93608721397cd515d"
    const response = await fetch("https://9hq1yxukvc-3.algolianet.com/1/indexes/*/queries?" + params, { method: "POST", headers: headers, body: JSON.stringify(request)}).catch(function(e) {
      console.log(`Moulinette GameIcons | Cannot establish connection to server algolianet`, e)
    });
    
    const res = await response.json()
    let html = ""
    res.results[0].hits.forEach( r => {
      const author = r.id.split('/')[1]
      assets.push(`<div class="gameicon" title="${r._highlightResult.content.value}">
        <input type="checkbox" class="check" name="${r.id}" value="${r.id}">
        <img src="https://game-icons.net/icons/ffffff/000000/${r.id}.svg"/>
        <span class="label">${r.name}</span>
        <a href="https://game-icons.net/about.html#authors" target="_blank">${author}@game-icons.net</a>
      </div>`)
    })
  
    return assets
  }
  
  
  /**
   * Implements listeners
   */
  activateListeners(html) {
    // keep html for later usage
    this.html = html
    
    // enable alt _alternateColors
    this._alternateColors()
  }
  
  /**
   * Footer: 2 color pickers
   */
  async getFooter() {
    const fgColor = game.settings.get("moulinette", "gIconFgColor")
    const bgColor = game.settings.get("moulinette", "gIconBgColor")
    return `<div class="options">
      ${game.i18n.localize("mtte.foregroundColor")} <input class="color" type="text" name="fgColor" maxlength="7" value="${fgColor}"> <input type="color" value="${fgColor}" data-edit="fgColor">
      ${game.i18n.localize("mtte.backgroundColor")} <input class="color" type="text" name="bgColor" maxlength="7" value="${bgColor}"> <input type="color" value="${bgColor}" data-edit="bgColor"> 
    </div>`
  }
  
  _alternateColors() {
    $('.forge .gameicon').removeClass("alt");
    $('.forge .gameicon:even').addClass("alt");
  }
  
  
  /**
   * Implements actions
   * - clear: unchecks all check boxes
   * - install: installs all selected scenes
   */
  async onAction(classList) {
    if(classList.contains("clear")) {
      this.html.find(".list .check:checkbox").prop('checked', false);
    }
    else if(classList.contains("selectAll")) {
      this.html.find(".list .check:checkbox").prop('checked', true);
    }
    else if (classList.contains("install")) {
      const names = []
      this.html.find(".list .check:checkbox:checked").each(function () {
        names.push($(this).attr("name"))
      });
      
      this._installGameIcons(names)
    } 
    else {
      console.warn(`MoulinetteGameIcons | No action implemented for action '${classList}'`)
    }
  }
  
  
  /*************************************
   * Main action
   ************************************/
  async _installGameIcons(selected) {
    // retrieve color
    const fgColor = this.html.find("input[name='fgColor']").val()
    const bgColor = this.html.find("input[name='bgColor']").val()
    let re = /#[\da-f]{6}/;
    if(!re.test(fgColor) || !re.test(bgColor)) {
      return ui.notifications.error(game.i18n.localize("ERROR.mtteInvalidColor"))
    }
    
    // store colors as preferences
    game.settings.set("moulinette", "gIconFgColor", fgColor)
    game.settings.set("moulinette", "gIconBgColor", bgColor)
    
    SceneNavigation._onLoadProgress(game.i18n.localize("mtte.installingGameIcons"),0);  
    let idx = 0;
    for(const svg of selected) {
      idx++;
      const headers = { method: "POST", headers: { 'Accept': 'application/json', 'Content-Type': 'application/json'}, body: JSON.stringify({ url: svg }) }
      const response = await fetch(game.moulinette.applications.MoulinetteClient.SERVER_URL + "/bundler/fvtt/gameicon", headers).catch(function(e) {
        console.error(`Moulinette GameIcons | Cannot download image ${svg}`, e)
      });
      if(!response) continue
      
      let text = await response.text()
      let imageName = svg.split('/').pop() + ".svg"
      
      if(fgColor != "#ffffff" || bgColor != "#000000") {
        text = text.replace(`fill="#fff"`, `fill="${fgColor}"`).replace(`<path d=`, `<path fill="${bgColor}" d=`)
        imageName = svg.split('/').pop() + `-${fgColor}-${bgColor}.svg`
      }
      
      await game.moulinette.applications.MoulinetteFileUtil.upload(new File([text], imageName, { type: "image/svg+xml", lastModified: new Date() }), imageName, "moulinette/images", `moulinette/images/gameicons`, true)
      SceneNavigation._onLoadProgress(game.i18n.localize("mtte.installingGameIcons"), Math.round((idx / selected.length)*100));
    }
    SceneNavigation._onLoadProgress(game.i18n.localize("mtte.installingGameIcons"),100);  
    ui.notifications.info(game.i18n.localize("mtte.forgingGameIconsSuccess"))
    
    // copy path into clipboard
    navigator.clipboard.writeText("moulinette/images/gameicons").catch(err => {
      console.warn("Moulinette GameIcons | Not able to copy path into clipboard")
    });
  }
  
}
