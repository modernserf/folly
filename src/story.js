import { Component } from 'react'
import PropTypes from 'prop-types'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { last } from 'ramda'
import h from 'react-hyperscript'
import styled from 'styled-components'

export const Layout = styled.div`
    display: flex;
    flex-direction: row;
`

const Pre = styled.pre`
    font-family: 'Fira Code';
    padding: 1em;
    font-size: 18px;
`

const BaseCell = styled.div`
    width: 375px;
`

export const iPhoneXHeight = 812
export const demoHeight = 640
const height = demoHeight

export const Container = styled(BaseCell)`
    height: ${height}px;
    border: 1px solid #ccc;
    border-radius: 20px;
    overflow: auto;
    margin: 20px;
    padding: 20px;
    font-family: 'Parc Place', sans-serif;
    font-size: 14px;
    color: #333;
`

const CellCols = styled.div`
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    margin: 20px;
    padding: 20px;
    height: ${height}px;
`

const Cell = styled(BaseCell)`
    padding-right: 1em;
    &>div {
        box-shadow: ${({ active }) => active ? '0 0 10px blue' : 'none'};
    }
`

export class Player extends Component {
    static propTypes = {
        children: PropTypes.func.isRequired,
        component: PropTypes.any.isRequired,
        actions: PropTypes.array.isRequired,
        reducer: PropTypes.func.isRequired,
        initState: PropTypes.object,
        timeout: PropTypes.number,
    }
    static defaultProps = {
        timeout: 100,
    }
    constructor (props) {
        super(props)
        this.state = { frame: 0 }
        this.store = createStore(() => this.getInitState(props))
    }
    componentWillUnmount () {
        clearTimeout(this.timeout)
    }
    getInitState (props = this.props) {
        return props.initState || props.reducer(undefined, { type: 'INIT' })
    }
    getCurrentReducer () {
        const { actions, reducer } = this.props
        const { frame } = this.state
        return () => actions.slice(0, frame + 1).reduce(reducer, this.getInitState())
    }
    onNext = () => {
        this.setState(({ frame }) => ({ frame: frame + 1 }))
    }
    onPlay = () => {
        if (this.state.frame < this.props.actions.length - 1) {
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
        const { children } = this.props
        this.store.replaceReducer(this.getCurrentReducer())

        return h(Provider, { store: this.store },
            h('div', [
                children({ frame, onNext, onPlay, setFrame }),
            ]))
    }
}

export const Range = ({ onChange, ...props }) =>
    h('input', { type: 'range', ...props, onChange: (e) => onChange(Number(e.target.value)) })

export const typing = (text) => text.split('').map((ch) => ({ type: 'key_down', payload: ch }))

const createMockStore = (state) => createStore((_, __) => state)

const applyFrames = (data, reducer, initState) => data.reduce((items, next) =>
    items.concat([reducer(last(items), next)]),
initState ? [initState] : [])

export const PlayerWrap = ({ actions, reducer, initState, component: Program }) =>
    h(Player, {
        actions, reducer, initState,
    }, ({ children, onNext, onPlay, setFrame, frame }) => [
        h(Layout, [
            h(Container, [
                h(Program),
            ]),
            h(CellCols, [
                applyFrames(actions, reducer, initState).map((state, i) =>
                    h(Cell, {
                        key: i,
                        active: frame === i,
                        onClick: () => setFrame(i),
                    }, [
                        h(Provider, { store: createMockStore(state) }, [
                            h(Program),
                        ]),
                    ])),
            ]),
        ]),
        h(Layout, [
            h(Cell, [
                h('button', { onClick: onNext }, ['step']),
                h('button', { onClick: onPlay }, ['play']),
                h(Range, { min: 0, max: actions.length - 1, value: frame, onChange: setFrame }),
            ]),
            h(Pre, [JSON.stringify(actions[frame])]),
        ]),
    ])
