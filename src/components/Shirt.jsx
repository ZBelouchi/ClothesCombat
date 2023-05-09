import Design from './Design'
import template from '../assets/shirt-template.png'

export default function Shirt({design, slogan, animated=false}) {
    if (design === undefined) return 'loading...'
    return (
        <div className="shirt">
            <img className="shirt__base" src={template} alt="" />
            <div className="shirt__assets">
                <Design frames={design.frames} backgroundColor={design.backgroundColor} animated={animated}/>
                <p className="slogan">{slogan?.text}</p>
            </div>
        </div>
    )
}