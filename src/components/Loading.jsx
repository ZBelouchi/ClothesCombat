import React from 'react'
import images from '../assets/images'

export default function Loading({message}) {
    return (
        <div className="loading">
            <h1 className='loading__header'>LOADING</h1>
            <img className='loading__icon' src={images.loading} alt="loading" />
            <p className='loading__message'>{message}</p>
        </div>
    )
}
