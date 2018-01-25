import { Fragment, Component } from 'react'
import h from 'react-hyperscript'
import styled from 'styled-components'

export const DevContainer = styled.div`
    width: ${({ width }) => width || '400px'};
    padding: 1em;
    font-family: "Marker Felt", sans-serif;
`

export class Player extends Component {
    static defaultProps = {
        timeout: 100,
    }
    state = { frame: 0 }
    componentWillUnmount () {
        clearTimeout(this.timeout)
    }
    onNext = () => {
        this.setState(({ frame }) => ({ frame: frame + 1 }))
    }
    onPlay = () => {
        if (this.state.frame < this.props.frames.length - 1) {
            this.onNext()
            this.timeout = setTimeout(this.onPlay, this.props.timeout)
        }
    }
    setFrame = (frame) => {
        this.setState({ frame })
    }
    render () {
        const { onNext, onPlay, setFrame } = this
        const { frame } = this.state
        const { frames, children, showAll } = this.props
        const activeFrame = frames[frame % frames.length]
        return h(Fragment,
            children({
                children: showAll ? frames : activeFrame,
                frames,
                frame,
                onNext,
                onPlay,
                setFrame,
            }),
        )
    }
}

export const Range = ({ onChange, ...props }) =>
    h('input', { type: 'range', ...props, onChange: (e) => onChange(Number(e.target.value)) })

export const typing = (text) => text.split('').map((ch) => ({ type: 'key_down', payload: ch }))
