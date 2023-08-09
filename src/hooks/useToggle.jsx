import {useState} from 'react'

export default function useToggle(defaultValue) {
    const [value, setValue] = useState(defaultValue)

    function toggleValue(value) {
        setValue(currentValue =>
            typeof value === "boolean" ? value : !currentValue
        )
    }

    return [value, toggleValue]
}

/* useToggle - creates boolean state with simple toggle functions

    const [value, toggleValue] = useToggle(initialBool)

    value

    toggleValue()
    toggleValue(true)
    toggleValue(false)
*/