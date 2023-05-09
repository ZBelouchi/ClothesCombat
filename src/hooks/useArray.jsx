import { useState } from 'react'

export default function useArray(defaultValue) {
    const [array, setArray] = useState(defaultValue)

    function push(element) {
        setArray(a => [...a, element])
    }

    function filter(callback) {
        setArray(a => a.filter(callback))
    }

    function update(index, newElement) {
        if (index < 0) {
            index = array.length + index
        }
        setArray(a => [
            ...a.slice(0, index),
            newElement,
            ...a.slice(index + 1, a.length)
        ])
    }

    function insert(index, newElement) {
        if (index < 0) {
            index = array.length + index
        }
        setArray(a => [
            ...a.slice(0, index),
            newElement,
            ...a.slice(index, a.length)
        ])
    }

    function remove(index) {
        if (index < 0) {
            index = array.length + index
        }
        setArray(a => [
            ...a.slice(0, index),
            ...a.slice(index + 1, a.length)
        ])
    }

    function clear() {
        setArray([])
    }

    function pop(index) {
        if (index < 0) {
            index = array.length + index
        }
        let x = array[index]
        setArray(a => [
            ...a.slice(0, index),
            ...a.slice(index + 1, a.length)
        ])
        return x
    }

    function reverseIndex(index, arr=array) {
        if (arr.length === 0) {return null}
        return arr[arr.length - Math.abs(index)]
    }

    return {
        array,            // array state
        set: setArray,    // state change function
        reverseIndex,     // return item at negative index (n from end)
        push,             // add item to end
        insert,           // insert item in array at index (moves current occupant over)
        update,           // replace item in array by index
        remove,           // remove item by index
        pop,              // remove item while returning value
        filter,           // run filter callback over
        clear             // remove all items
    }
}

/* useArray - simplifies array methods for states with array values

    const { array, set, reverseIndex, push, insert, update, remove, pop, filter, clear } = useArray(arr)

    array

    reverseIndex(1)     // access array value like python's list[-1]
    reverseIndex(-1)    // takes abs of value so negative and positive both work, use by preference

    set([...values])
    push(newValue)
    filter(testCallback)
    update(replacedIndex, newValue)
    remove(index)
    clear()

    const x = pop(index)

    // update, remove, insert, pop take negative indexes
    remove(-2)  // removes second to last item
    
*/