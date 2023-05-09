import React, { useEffect } from 'react'

import useObject from '../hooks/useObject';

export default function Form({form, dataSetter}) {
    const {object: data, update: updateData} = useObject({})
    const defaults = {
        text: '',
        number: '',
        radio: ''
    }

    useEffect(() => {
        form.inputs.map(input => {
            if (input.type === 'submit') return
            updateData({[input.id]: input?.initial ?? defaults[input.type]})
        })
    }, [])

    useEffect(() => {
        dataSetter(data)
    }, [{...data}])

    return (
        <div>
            {form.inputs.map(input => {
                // Text
                if (input.type == 'text') {return (
                    <div key={`Form-${input.id}`}>
                        {input?.label &&
                            <label htmlFor={input.id} key={`label-${input.id}`}>
                                {input.label}
                            </label>
                        }
                        <input 
                            type="text" 
                            id={input.id} 
                            key={`input-${input.id}`}
                            placeholder={input?.placeholder}
                            value={data[input.id]}
                            onChange={e => updateData({[input.id]: e.target.value})}
                        />
                    </div>
                )}
                // Number
                else if (input.type == 'number') {return (
                    <div key={`Form-${input.id}`}>
                        {input?.label &&
                            <label htmlFor={input.id} key={`label-${input.id}`}>
                                {input.label}
                            </label>
                        }
                        <input 
                            type="number" 
                            id={input.id} 
                            key={`input-${input.id}`}
                            placeholder={input?.placeholder}
                            value={data[input.id]}
                            onChange={e => updateData({[input.id]: e.target.value})}
                        />
                    </div>
                )}
                // Radio Buttons
                else if (input.type == 'radio') {return (
                    <div key={`Form-${input.id}`}>
                        {input.options.map(option => {return (
                            <>
                                {option?.label &&
                                    <label htmlFor={input.id} key={`Form-label-${input.id}-option-${option.value}`}>
                                        {option.label}
                                    </label>
                                }
                                <input 
                                    key={`Form-input-${input.id}-option-${option.value}`}
                                    type="radio" 
                                    name={input.id} 
                                    id={input.id} 
                                    value={option.value}
                                    onClick={e => updateData({[input.id]: option.value})}
                                    checked={data[input.id] === option.value}
                                />
                            </>
                        )})}
                    </div>
                )}
                // Submit
                else if (input.type == 'submit') {return (
                    <input type="submit" value={input.value} onClick={() => input.onSubmit()}/>
                )}
            })}
        </div>
    )
}

// USAGE /////////////////
function App() {
    const [formData, setFormData] = useState()

    const handleSubmit = e => {
        e.preventDefault()
        console.log(formData)
    }

    return (
        <>
            <Form
                // setter function for parent's state to track the form's values
                dataSetter={setFormData}

                // form content
                form={{
                    inputs: [
                        // inputs' initial data given in objects to generate the elements
                        {
                            // required props
                            type: 'text',            // input type (determines details)
                            id: 'sample',            // id of input (all ids passed to component must be unique from each other)
                            // optional props
                            label: 'Text Input: ',   // label string for input element
                            default: '',             // initial value of input (format may change by type)
                            placeholder: 'text here' // placeholder for value (if input type has one)
                        },
                        // props passed vary by input type:
                        // text
                        {type: 'text', id: 'name',
                            label: 'Name: ',
                            initial: 'John',
                            placeholder: 'enter name here'
                        },
                        // number
                        {type: 'number', id: 'age',
                            label: 'Age: ',
                            initial: 20,
                            placeholder: 'enter age here'
                            // min TBD
                            // max TBD
                        },
                        // radio
                        {type: 'radio', id: 'icon',
                            options: [                 // list of buttons in radio list
                                {                          // given array of objects, each detailing a radio button
                                    value: 'icon_file_1',      // value passed if button is selected
                                    label: ''                  // (opt.) label element for button
                                },
                                {value: 'icon_file_2', label: ''},
                                {value: 'icon_file_3', label: ''},
                            ],
                            initial: 'icon_file_1'      // default selected button (by value)
                        },
                        // submit
                        {type: 'submit',    // no ID needed for submit
                            value: 'Submit',                        // text content on the submit button
                            onSubmit: () => handleSubmit(formData)  // function to be executed when the a submit input is used
                        }

                        // button
                        // checkbox
                        // color
                        // date
                        // datetime-local
                        // email
                        // file
                        // hidden
                        // image
                        // month
                        // number
                        // password
                        // range
                        // reset
                        // search
                        // tel
                        // time
                        // url
                        // week
                        // textarea
                        // select
                        // datalist
                    ]
                }}
            />
        </>
    )
}