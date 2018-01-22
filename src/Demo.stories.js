import h from 'react-hyperscript'
import { storiesOf } from '@storybook/react'
import { Player } from './story'
import { Container, FactBlock } from './Demo'
import { reducer } from './tree'

const Range = ({ onChange, ...props }) =>
    h('input', { type: 'range', ...props, onChange: (e) => onChange(Number(e.target.value)) })

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
