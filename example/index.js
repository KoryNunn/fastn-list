var dom = require('fastn-dom')
var text = require('fastn-dom/text')
var list = require('../')
var binding = require('fastn/binding')
var mutate = require('fastn/mutate')

var state = {
    things: []
};

mutate.set(state, 'things', Array.from(new Array(10)).map((item, index) => String.fromCharCode(index + 97)));

var ui = dom('div', { class: 'Totes parent' },

    dom('table',
        dom('thead',
            dom('th', 
                dom('td', 'Some column header')
            )
        ),
        dom('tbody',
            list({
                items: binding('things'),
                template: () =>
                    list(
                        dom('tr', 
                            dom('td', 'Index: ', binding('key'))
                        ),
                        dom('tr', 
                            dom('td', 'Foo: ', binding('item'))
                        )
                    )
            })
        )
    ),

    list(text('a'), 'b'),

    dom('h1', 'fastn-dom demo app'),
    dom('section',
        dom('p',
            'Name: ', dom('label', binding('name'))
        ),
        dom('form',
            dom('input', {
                placeholder: 'Enter name',
                value: binding('name')
            })
            .on('input', (event, componentState, component) => {
                mutate.set(state, 'name', event.target.value);
            }),
            dom('button', { type: 'button' }, 'X')
            .on('click', (event, componentState, component) => {
                mutate.remove(state, 'name');
            })
        )
        .on('submit', (event, componentState, component) => {
            event.preventDefault();
            mutate.push(state, 'things', componentState.name);
            mutate.remove(state, 'name');
        }),
        dom('table',
            list({
                items: binding('things|*'),
                template: (itemState, componentState) => {
                    return 'foo'
                    return list(
                        binding('key', key => `key: ${key}`),
                        list(
                            dom('span', 'x'),
                            dom('span', 'y')
                        ),
                        dom('tr', 
                            dom('td', 'Foo')
                        ),
                        dom('tr',
                            dom('div',
                                binding('item', item => `item: ${item}`)
                            ),
                            dom('button', { type: 'button' }, 'X')
                            .on('click', (event, componentState, component) => {
                                mutate.remove(state.things, itemState.key);
                            })
                        ) 
                    )
                }
            })
        )
    )
)
.attach(state)
.render()

setTimeout(function(){
    mutate.set(state, 'things.1', 'THINGO');
}, 1000)

window.addEventListener('DOMContentLoaded', () => document.body.appendChild(ui.element))