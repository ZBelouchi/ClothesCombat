import React, { useRef, useState } from 'react'
//NOTE: this was originally for object states but had to turn it into refs cause of some chicanery. this will NOT cause re-renders when updated

export default function useObject(defaultValue) {
    const [object, setObject] = useState(defaultValue)
    // const object = useRef(defaultValue)
    // const setObject = (newValue) => {
    //     object.current = newValue
    // }

    function update(items) {
        console.log("attempting object value update to", items);
        setObject({...object, ...items})
    }

    // function remove(key) {
    //     let o = {...object}
    //     delete o[key]
    //     setObject({...o})
    // }

    // function pop(key) {
    //     let o = {...object}
    //     let x = o[key]
    //     delete o[key]
    //     setObject({...o})
    //     return x
    // }

    // function clear() {
    //     setObject({})
    // }

    return {
        object,             // object value
        set: setObject,     // function to set object's value
        update,             // add/update items passing in key/value pair
        // remove,             // remove an item by key
        // pop,                // remove an item by key and return it's value
        // clear               // remove all items from array,
    }
}

/* useObject - simplifies management for states with object values

    const {object, set, update, remove, pop, clear} = useObject({prop: 'initial'})

    object

    set({new: 'content'})   //replace

    // add or update existing items
    update({new: 'item'})
    update({prop: 'changed'})

    remove('prop')
    const x = pop('prop')
    clear()

 */