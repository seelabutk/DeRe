import { createApp } from 'vue'
import App from './App.vue'
import mitt from 'mitt'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faCopy, faTrash, faPlusSquare, faCut, faPaste, faBorderNone, faSave, faFile, faClone, faExpandArrowsAlt, faLink, faMap, faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faCopy, faTrash, faPlusSquare, faCut, faPaste, faBorderNone, faSave, faFile, faClone, faExpandArrowsAlt, faLink, faMap, faArrowUp, faArrowDown);

//customized mitt, emit has return type and added async emit
const myMitt = (all) => {
    const inst = mitt(all);
    inst.emitAsync = async function(type, e){
        let handlers = this.all.get(type);
        if(handlers) for (const f of handlers) await f(e);

        handlers = this.all.get('*');
        if(handlers) for (const f of handlers) await f(type, e);
    }
    inst.emit = function(type, e){
        let rets = [];
        let handlers = this.all.get(type);
        if(handlers) rets = rets.concat(handlers.map(f => f(e)));

        handlers = this.all.get('*');
        if(handlers) rets = rets.concat(handlers.map(f => f(e)));
        return rets;
    }
    return inst;
}

const emitter = myMitt();
const app = createApp(App);
app.config.globalProperties.emitter = emitter;
app.provide('emitter', emitter);
app.component('font-awesome-icon', FontAwesomeIcon);
app.mount('#app');
