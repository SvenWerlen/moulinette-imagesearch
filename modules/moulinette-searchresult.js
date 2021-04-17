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

    // download & upload image
    const headers = { method: "POST", headers: { 'Content-Type': 'application/json'}, body: JSON.stringify({ url: this.data.url }) }
    const res = await fetch(game.moulinette.applications.MoulinetteClient.SERVER_URL + "/search/download", headers).catch(function(e) {
      ui.notifications.error(game.i18n.localize("ERROR.mtteDownloadTimeout"));
      console.log(`Moulinette | Cannot download image ${svg}`, e)
      return;
    });
    const blob = await res.blob()
    
    let imageName = this.data.url.split('/').pop()
    if(imageName.includes(".")) {
      imageName = imageName.substr(0, imageName.lastIndexOf('.'));
    }
    if(!this.data.format) {
      this.data.format = blob.type.split('/').pop()
    }
    imageName = imageName.replace(/[\W_]+/g,"-") + "." + this.data.format
    
    await game.moulinette.applications.MoulinetteFileUtil.upload(new File([blob], imageName, { type: blob.type, lastModified: new Date() }), imageName, "moulinette/images", `moulinette/images/search`, false)
    const filepath = "moulinette/images/search/" + imageName

    // create article if requested
    if(event.submitter.className == "createArticle") {
      ui.journal.activate() // give focus to journal
      const article = await JournalEntry.create( {name: this.data.name, img: filepath} )
      article.sheet.render(true)
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.bringToTop()
    html.find(".thumb").css('background', `url(${this.data.thumb}) 50% 50% no-repeat`)
  }
  
}
