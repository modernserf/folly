import shortid from 'shortid'
import { Component } from 'react'
import h from 'react-hyperscript'
import { last } from 'ramda'
import styled from 'styled-components'
import { storiesOf } from '@storybook/react'
import { Player, Range } from './story'
import { Program } from './DemoTable'
import { reducer } from './data'
import { program, ruleBlock, header, ruleCase, varr, op, struct, list } from './tree'

export const Layout = styled.div`
    display: flex;
    flex-direction: row;
    font-family: 'Parc Place', sans-serif;
    font-size: 14px;
    color: #333;
`

const Pre = styled.pre`
    font-family: 'Fira Code';
    padding: 1em;
`

const BaseCell = styled.div`
    width: 375px;
`

export const Container = styled(BaseCell)`
    height: 812px;
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
    height: 812px;
`

const Cell = styled(BaseCell)`
    padding-right: 1em;
    &>div {
        box-shadow: ${({ active }) => active ? '0 0 10px blue' : 'none'};
    }
`

const dispatch = (type, payload) => ({ type, payload })

const Button = ({ type, payload, onChange, label }) => h('button', {
    onClick: () => onChange({ type, payload }),
}, [label || type])

const TextField = ({ type, onChange }) => h('form', {
    onSubmit: (e) => {
        e.preventDefault()
        onChange({ type, payload: e.target.querySelector('input').value })
    },
}, [
    h('label', [type]),
    h('input', { type: 'text' }),
])

const ActionContainer = styled.div`
    position: absolute;
    width: 100%;
    bottom: 0;
    left: 0;
    background-color: #eee;
    padding: 20px;
    font-size: 16px;
`

const OperatorButton = ({ onChange, id }) =>
    h('button', { onClick: () => onChange({ type: 'addOperator', payload: id }) }, [id])

const Actions = ({ onChange }) => h(ActionContainer, [
    h(Button, { onChange, type: 'appendBlock', payload: shortid.generate() }),
    h(Button, { onChange, type: 'appendRuleCase' }),
    h(Button, { onChange, type: 'appendRuleLine' }),
    h(Button, { onChange, type: 'appendHeaderField' }),
    h(Button, { onChange, type: 'appendFactAsRule' }),

    // TODO: moveBlock | Rule | Line

    h(TextField, { onChange, type: 'setHeaderLabel' }),
    h(TextField, { onChange, type: 'setHeaderVar' }),

    // TODO: enumerate known operators
    h(OperatorButton, { onChange, id: '==' }),
    h(OperatorButton, { onChange, id: '!=' }),
    h(Button, { onChange, type: 'addEmptyList', label: '[]' }),
    h(Button, { onChange, type: 'addConsList', label: '[|]' }),

    // TODO: enumerate known vars
    h(TextField, { onChange, type: 'addVar' }),
    // TODO: addNewVar

    // TODO: enumerate known structs
    h(TextField, { onChange, type: 'addStruct' }),

    h(TextField, { onChange, type: 'addText' }),

    // TODO: selectBody | selectHeader

    h(Button, { onChange, type: 'commentOut' }),
    h(Button, { onChange, type: 'removeValue' }),
    h(Button, { onChange, type: 'cut' }),
    h(Button, { onChange, type: 'paste' }),
])

class Demo extends Component {
    state = { appState: reducer(undefined, { type: 'INIT' }) }
    onChange = (action) => {
        this.setState(({ appState }) => ({ appState: reducer(appState, action) }))
    }
    render () {
        const { appState } = this.state

        return h(Container, [
            h(Program, appState),
            h(Actions, { onChange: this.onChange }),
        ])
    }
}

const ruleFrames = [
    dispatch('appendBlock', 'item:not_in:'),

    dispatch('setHeaderLabel', 'Item'),
    dispatch('appendHeaderField'),
    dispatch('setHeaderLabel', 'Not in'),
    dispatch('setHeaderVar', 'List'),

    dispatch('appendRuleCase'),
    dispatch('addOperator', '=='),
    dispatch('addVar', 1),
    dispatch('addEmptyList'),

    dispatch('appendRuleCase'),
    dispatch('addOperator', '=='),
    dispatch('addVar', 1),
    dispatch('addConsList'),
    dispatch('addNewVar', { label: 'First', id: 'first' }),
    dispatch('addNewVar', { label: 'Rest', id: 'rest' }),

    dispatch('appendRuleLine'),
    dispatch('addOperator', '!='),
    dispatch('addVar', 0),
    dispatch('addVar', 'first'),

    dispatch('appendRuleLine'),
    dispatch('addStruct', 'item:not_in:'),
    dispatch('addVar', 0),
    dispatch('addVar', 'rest'),
]

const factsAsRules = [
    dispatch('appendBlock', 'from:to:line:'),

    dispatch('setHeaderLabel', 'From'),
    dispatch('appendHeaderField'),
    dispatch('setHeaderLabel', 'To'),
    dispatch('appendHeaderField'),
    dispatch('setHeaderLabel', 'Line'),

    dispatch('appendFactAsRule'),
    dispatch('addText', 'Park Street'),
    dispatch('addText', 'Downtown Crossing'),
    dispatch('addText', 'Red'),

    dispatch('appendFactAsRule'),
    dispatch('addText', 'Park Street'),
    dispatch('addText', 'Govt Center'),
    dispatch('addText', 'Green'),
]

const editingFields = [
    dispatch('INIT'),
    (state) => ({
        ...state,
        program: program({
            'item:not_in:': ruleBlock(
                'item:not_in:',
                [header('Item'), header('Not in', 'List')],
                [ruleCase(
                    {},
                    [op('==', varr(1), list())]
                ),
                ruleCase(
                    { first: 'First', rest: 'Rest' },
                    [
                        op('==', varr(1), list([varr('first')], varr('rest'))),
                        op('!=', varr(0), varr('first')),
                        struct('item:not_in:', [varr(0), varr('rest')]),
                    ]
                )]
            ),
        }),
    }),
    dispatch('selectBody', { block: 'item:not_in:', rule: 1, path: [1] }),
    dispatch('commentOut'),
    dispatch('selectHeader', { block: 'item:not_in:', headerField: 1 }),
    dispatch('setHeaderVar', 'Items'),
    dispatch('selectBody', { block: 'item:not_in:', rule: 1, path: [0, 'rhs', 'tail'] }),
    dispatch('removeValue'),
    dispatch('selectBody', { block: 'item:not_in:', rule: 1, path: [0, 'rhs', 'children', 0] }),
    dispatch('removeValue'),
    dispatch('addVar', 'first'),
    dispatch('addVar', 'rest'),
    dispatch('selectBody', { block: 'item:not_in:', rule: 1, path: [2] }),
    dispatch('removeValue'),
    dispatch('moveRule', { block: 'item:not_in:', rule: 1, toRule: 0 }),
    dispatch('moveLine', { block: 'item:not_in:', rule: 0, line: 0, toLine: 1 }),
]

const PlayerWrap = ({ frames }) =>
    h(Layout, [
        h('div', [
            h(Player, {
                frames: applyFrames(frames).map((state, i) => h(Program, { key: i, ...state })),
            }, ({ children, onNext, onPlay, setFrame, frame }) => [
                h(Layout, [
                    h(Container, [
                        children,
                    ]),
                    h(CellCols, [
                        applyFrames(frames).map((state, i) =>
                            h(Cell, {
                                key: i,
                                active: frame === i,
                                onClick: () => setFrame(i),
                            }, [h(Program, state)])),
                    ]),
                ]),
                h(Layout, [
                    h(Cell, [
                        h('button', { onClick: onNext }, ['step']),
                        h('button', { onClick: onPlay }, ['play']),
                        h(Range, { min: 0, max: frames.length - 1, value: frame, onChange: setFrame }),
                    ]),
                    h(Pre, [JSON.stringify(frames[frame])]),
                ]),
            ]),
        ]),

    ])

const applyFrames = (data) => data.reduce((items, next) =>
    typeof next === 'function'
        ? items.concat([next(last(items))])
        : items.concat([reducer(last(items), next)]),
[])

storiesOf('Demo', module)
    .add('create rule', () =>
        h(PlayerWrap, {
            frames: ruleFrames,
        }))
    .add('create fact', () =>
        h(PlayerWrap, {
            frames: factsAsRules,
        }))
    .add('editing', () =>
        h(PlayerWrap, {
            frames: editingFields,
        }))
    .add('buttons', () =>
        h(Demo)
    )
