class VaaS_Visint extends VaaS_Base {
    constructor() {
        super();
        const template = document.createElement('template');
        template.innerHTML = `
        <style>
          :host {
            width: 100%;
            height: auto;
          }
          .container {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
          }
          iframe {
            width: 100%;
            height: 100%;
          }
        </style>
        <iframe class="visint_iframe"></iframe>
        `;


        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.type = 'visint';
        this.service = this.vaas.get_service(this.type);
        // this.serviceSetupModal = this.shadowRoot.querySelector('.setup');
        this.serviceSetupModal = new Modal(
          `<div class="modal">
            <div class="header">
              <h5 class="title">VisInt Options</h5>
              <span class="icon close" data-slot="close" data-event="click">close</span>
            </div>
            <div class="body">
              <label for="visint_rva"">RVA filename</label>
              <input type="text" id="visint_rva">  
            </div>
            <div class="footer">
              <span data-slot="cancel" data-event="click">Cancel</span>
              <span data-slot="continue" data-event="click">Add</span>
            </div>
          </div>`
        );
        const body = document.querySelector('body');
        body.insertBefore(this.serviceSetupModal, body.firstChild);
    }

    serviceSetup(){
      let src = "../visint/dist/index.html"
      const promise = new Promise((resolve) => {
        this.serviceSetupModal.open();
        this.serviceSetupModal.addEventListener('continue', (e) => { 
          let rvaFileName = ''
          const rvaInput = this.serviceSetupModal.querySelector('#visint_rva');
          if(rvaInput){
            rvaFileName = rvaInput.value;
          }
          src = `${src}#${rvaFileName}`;
          this.shadowRoot.querySelector('.visint_iframe').src = src;
          this.serviceSetupModal.delete();
          resolve();
        });
      });
      return promise;
    }
}
customElements.define('vaas-visint', VaaS_Visint);