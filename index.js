var fastn = require('fastn');
var mutate = require('fastn/mutate');
var getComponentConfig = require('fastn/getComponentConfig');
var componentTemplateMap = new WeakMap();
var componentDataMap = new WeakMap();

function each(value, fn){
    if(!value || typeof value !== 'object'){
        return;
    }

    if(Array.isArray(value)){
        for(var i = 0; i < value.length; i++){
            fn(value[i], i)
        }
    }else{
        for(var key in value){
            fn(value[key], key);
        }
    }
}

function keyFor(object, value, taken){
    if(!object || typeof object !== 'object'){
        return false;
    }

    if(Array.isArray(object)){
        for(var i = 0; i < object.length; i++){
            if(object[i] === value && !(i in taken)){
                return i;
            }
        }
    }

    for(var key in object){
        if(object[key] === value && !(key in taken)){
            return key;
        }
    }

    return false;
}

function updateItems(component, items){
    var componentConfig = getComponentConfig(component);

    insertQueue = [];

    var value = component.items;
    var template = component.template;
    var emptyTemplate = component.emptyTemplate;
    var insertionFrameTime = component.insertionFrameTime || Infinity;

    var updates = value ? Array.isArray(value) ? [] : {} : [];

    fastn.component.getChildren(component).slice().forEach(function(childComponent, index){
        var itemData = componentDataMap.get(childComponent);
        var componentTemplate = componentTemplateMap.get(childComponent);

        if(!componentTemplate){
            // Not a templated component
            return;
        }

        var currentKey = keyFor(value, itemData.item, updates);

        if(componentTemplate === template && currentKey !== false){
            updates[currentKey] = [itemData, null, childComponent];
        } else {
            componentTemplateMap.delete(childComponent);
            fastn.component.remove(childComponent);
            childComponent.emit('removeElement');
            componentDataMap.delete(childComponent)
        }
    });

    var currentIndex = 0;
    each(value, (item, key) => {
        if(updates[key]){
            updates[key][1] = currentIndex++
            return
        }

        var itemData = { item, key };

        updates[key] = [itemData, currentIndex++];
    });

    each(updates, function(update, key){
        var itemData = update[0];
        var childIndex = update[1];
        var childComponent = update[2];

        mutate.set(itemData, 'key', key);

        if(!childComponent){
            childComponent = template(itemData, componentConfig.state)
            if(!fastn.is.component(childComponent)){
                childComponent = fastn.component({ text: childComponent });
                childComponent.render = function(renderers){
                    renderers.text(childComponent);
                    childComponent.emit('render', childComponent, renderers);
                }
            }
            childComponent.attach(itemData, 2);
            componentTemplateMap.set(childComponent, template);
        }

        componentDataMap.set(childComponent, itemData);

        if(componentConfig.renderers){
            childComponent.render(componentConfig.renderers);
        }
        fastn.component.insertChild(component, childComponent, childIndex);
        childComponent.emit('insertElement', component, childIndex);
    });
}

function renderListComponent(component){
    component.element = [];

    var parentComponent = fastn.component.getParent(component);

    if(parentComponent){
        component.containerElement = parentComponent.containerElement || parentComponent.element;
    }

    component.on('insertElement', (parentComponent, index) => {
        var componentConfig = getComponentConfig(component);

        if(component.element){
            component.containerElement = parentComponent.containerElement || parentComponent.element;
        }

        fastn.component.getChildren(component).forEach((child, childIndex) => {
            child.emit('insertElement', component, childIndex);
        });
    });
    component.on('removeElement', () => 
        fastn.component.getChildren(component).forEach(child => child.emit('removeElement'))
    );

    return component;
}

function listComponent(settings, ...children){
    if(typeof settings === 'string' || typeof settings === 'number' || fastn.is.attachable(settings)){
        children.unshift(settings);
        settings = {};
    }

    var component = fastn.component(settings, children);

    fastn.setProperty(component, 'items', {
        value: component.items || []
    });

    var hasRendered;
    component.render = function(renderers){

        if(component.element){
            return;
        }
        var componentConfig = getComponentConfig(component);
        renderers['list'] = renderers['list'] || renderListComponent;
        renderers.list(component);
        componentConfig.renderers = renderers;

        component.emit('render', component, renderers);

        var parentComponent = fastn.component.getParent(component);

        if(parentComponent){
            component.containerElement = parentComponent.containerElement || parentComponent.element;
        }

        fastn.component.getChildren(component).forEach((child, childIndex) => {
            child.render(componentConfig.renderers);
            if(parentComponent){
                child.emit('insertElement', component, childIndex);
            }
        });

        return component;
    }

    updateItems(component, component.items);
    component.on('items', items => updateItems(component, items));

    return component;
}

module.exports = listComponent;