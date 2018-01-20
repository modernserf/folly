import { Fragment, Component } from 'react'
import h from 'react-hyperscript'
import styled from 'styled-components'
import { storiesOf } from '@storybook/react'

class Player extends Component {
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
        const { frames, children } = this.props
        const activeFrame = frames[frame % frames.length]
        return h(Fragment,
            children({ children: activeFrame, frames, frame, onNext, onPlay, setFrame }),
        )
    }
}

const Container = styled.div`
    width: 375px;
    height: 812px;
    border: 1px solid #ccc;
    border-radius: 20px;
    margin: 20px;
    padding: 20px;
    font-family: 'Parc Place', sans-serif;
    color: #333;
`

const Selected = styled.span`
    display: inline-block;
    padding-bottom: 2px;
    border-bottom: 2px solid green;
`

const Block = styled.div`
    margin-bottom: 1em;
`
const Line = styled.div`
    padding-bottom: 0.5em;
`
const DupLine = styled.div`
    padding-bottom: 0.5em;
`

const Atom = styled.span`
`
const DupFunctor = styled.span`
    color: #999;
`

const Placeholder = styled.span`
    display: inline-block;
    height: 0.8em;
    width: 0.8em;
    background-color: #ccc;
    border-radius: 4px;
`

const TermWrap = styled.span`
`

const Terms = ({ children }) =>
    h(TermWrap, {}, ['(', children, ')'])

const EndRule = styled.span``

const SelectedIf = ({ selected, children }) => selected
    ? h(Selected, [children])
    : children

const FactLine = ({ selection, dup, values: [functor, ...terms] }) =>
    h(dup ? DupLine : Line, [
        h(SelectedIf, { selected: selection === 0 }, [
            h(dup ? DupFunctor : Atom, [functor || h(Placeholder)]),
        ]),
        h(Terms, [
            ...terms.map((term, i) =>
                h(SelectedIf, { key: i, selected: selection === i + 1 }, [
                    term || h(Placeholder),
                ])),
        ]),
        h(EndRule, ['.']),
    ])

const FactBlock = ({ selectionPath, lines }) =>
    h(Block, lines.map((line, i) => [
        h(FactLine, {
            selection: selectionPath[0] === i ? selectionPath[1] : null,
            dup: line[0] === (lines[i - 1] || [])[0],
            values: line,
        }),
    ]))

const Range = ({ onChange, ...props }) =>
    h('input', { type: 'range', ...props, onChange: (e) => onChange(Number(e.target.value)) })

const map = (obj, fn) => Array.isArray(obj)
    ? obj.map(fn)
    : Object.entries(obj).reduce((m, [k, v]) => { m[k] = fn(v, k); return m }, {})

const update = (path, fn) => (data) => {
    if (path.length) {
        const [h, ...t] = path
        return map(data, (value, key) => key === h ? update(t, fn)(value) : value)
    } else {
        return fn(data)
    }
}

const pipe = (fs) => (init) =>
    fs.reduce((state, f) => f(state), init)

const updateAtPath = (fn) => (state) => update(['lines', ...state.selectionPath], fn)(state)

const insertNewLine = update(['lines'], (lines) => [...lines, ['', '']])
const selectNextLine = pipe([
    update(['selectionPath', 0], (y) => y + 1),
    update(['selectionPath', 1], () => 0),
])
const selectNextToken = update(['selectionPath', 1], (x) => x + 1)
const copyTokenAbove = (state) => {
    const { lines, selectionPath: [y, x] } = state
    return updateAtPath(() => lines[y - 1][x])(state)
}

const match = (map, initState) => (state = initState, action) => map[action.type]
    ? map[action.type](state, action.payload, action)
    : state

const reducer = match({
    key_down: (state, ch) => updateAtPath((w) => w + ch)(state),
    next_focus: selectNextToken,
    new_line_dup: pipe([insertNewLine, selectNextLine, copyTokenAbove, selectNextToken]),
}, {
    lines: [['', '']],
    selectionPath: [0, 0],
})

const typing = (text) => text.split('').map((ch) => ({ type: 'key_down', payload: ch }))

function * renderActions (actions) {
    let state = reducer(undefined, {})
    yield h(FactBlock, state)
    for (const action of actions) {
        state = reducer(state, action)
        yield h(FactBlock, state)
    }
}

storiesOf('Demo', module)
    .add('base', () => (
        h(Player, { frames: [
            ...renderActions([
                ...typing('station'),
                { type: 'next_focus' },
                ...typing('Park Street'),
                { type: 'new_line_dup' },
                ...typing('Downtown Crossing'),
                { type: 'new_line_dup' },
                ...typing('Government Center'),
                { type: 'new_line_dup' },
                ...typing('State Street'),
                { type: 'new_line_dup' },
                ...typing('Haymarket'),
            ]),
        ] }, ({ children, onNext, onPlay, setFrame, frame, frames }) => [
            h(Container, [
                children,
            ]),
            h('button', { onClick: onNext }, ['step']),
            h('button', { onClick: onPlay }, ['play']),
            h(Range, { min: 0, max: frames.length - 1, value: frame, onChange: setFrame }),
        ]))
    )
