import h from 'react-hyperscript'
import { last } from 'ramda'
import styled from 'styled-components'
import { storiesOf } from '@storybook/react'
import { Player, Range } from './story'
import { Program } from './DemoTable'

import { reducer } from './data'
import { program, ruleBlock, header, ruleCase, varr, op, struct, list } from './tree'

export const Container = styled.div`
    width: 375px;
    height: 812px;
    border: 1px solid #ccc;
    border-radius: 20px;
    margin: 20px;
    padding: 20px;
    font-family: 'Parc Place', sans-serif;
    font-size: 14px;
    color: #333;
    overflow: auto;
`

const dispatch = (type, payload) => (state) => reducer(state, { type, payload })

const ruleFrames = [
    dispatch('appendBlock', 'item:not_in:'),

    dispatch('setHeader', header('Item', undefined, 'item')),
    dispatch('appendHeaderField'),
    dispatch('setHeader', header('Not in', undefined, 'not_in')),
    dispatch('setHeaderVar', 'List'),

    dispatch('appendRuleCase'),
    dispatch('addOperator', '=='),
    dispatch('addVar', 'not_in'),
    dispatch('addEmptyList'),

    dispatch('appendRuleCase'),
    dispatch('addOperator', '=='),
    dispatch('addVar', 'not_in'),
    dispatch('addConsList'),
    dispatch('addNewVar', { label: 'First', id: 'first' }),
    dispatch('addNewVar', { label: 'Rest', id: 'rest' }),

    dispatch('appendRuleLine'),
    dispatch('addOperator', '!='),
    dispatch('addVar', 'item'),
    dispatch('addVar', 'first'),

    dispatch('appendRuleLine'),
    dispatch('addStruct', 'item:not_in:'),
    dispatch('addVar', 'item'),
    dispatch('addVar', 'rest'),
]

const factsAsRules = [
    dispatch('appendBlock', 'from:to:line:'),

    dispatch('setHeader', header('From')),
    dispatch('appendHeaderField'),
    dispatch('setHeader', header('To')),
    dispatch('appendHeaderField'),
    dispatch('setHeader', header('Line')),

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
        program: program([
            ruleBlock(
                'item:not_in:',
                [header('Item', undefined, 'item'), header('Not in', 'List', 'not_in')],
                [ruleCase(
                    {},
                    [op('==', varr('not_in'), list())]
                ),
                ruleCase(
                    { first: 'First', rest: 'Rest' },
                    [
                        op('==', varr('not_in'), list([varr('first')], varr('rest'))),
                        op('!=', varr('item'), varr('first')),
                        struct('item:not_in:', [varr('item'), varr('rest')]),
                    ]
                )]
            ),
        ]),
    }),
    dispatch('selectBody', { block: 0, rule: 1, path: [1] }),
    dispatch('commentOut'),
    dispatch('selectHeader', { block: 0, headerField: 1 }),
    dispatch('setHeaderVar', 'Items'),
    dispatch('selectBody', { block: 0, rule: 1, path: [0, 'rhs', 'tail'] }),
    dispatch('removeValue'),
    dispatch('selectBody', { block: 0, rule: 1, path: [0, 'rhs', 'children', 0] }),
    dispatch('removeValue'),
    dispatch('addVar', 'first'),
    dispatch('addVar', 'rest'),
    dispatch('selectBody', { block: 0, rule: 1, path: [2] }),
    dispatch('removeValue'),
    dispatch('moveRule', { block: 0, rule: 1, toRule: 0 }),
    dispatch('moveLine', { block: 0, rule: 0, line: 0, toLine: 1 }),
]

const PlayerWrap = (props) =>
    h(Player, props, ({ children, onNext, onPlay, setFrame, frame, frames }) => [
        h(Container, [
            children,
        ]),
        h('button', { onClick: onNext }, ['step']),
        h('button', { onClick: onPlay }, ['play']),
        h(Range, { min: 0, max: frames.length - 1, value: frame, onChange: setFrame }),
    ])

const applyFrames = (data) => data.reduce((items, next) =>
    typeof next === 'function'
        ? items.concat([next(last(items))])
        : items.concat([next]),
[])

storiesOf('Demo', module)
    .add('create rule', () =>
        h(PlayerWrap, {
            showAll: true,
            frames: applyFrames(ruleFrames).map((state, i) => h('div', [
                h(Program, { key: i, ...state }),
                // h('pre', { style: { lineHeight: 1.4 } }, [JSON.stringify(state, null, 2)]),
            ])),
        }))
    .add('create fact', () =>
        h(PlayerWrap, {
            showAll: true,
            frames: applyFrames(factsAsRules).map((state, i) => h('div', [
                h(Program, { key: i, ...state }),
                // h('pre', { style: { lineHeight: 1.4 } }, [JSON.stringify(state, null, 2)]),
            ])),
        }))
    .add('editing', () =>
        h(PlayerWrap, {
            showAll: true,
            frames: applyFrames(editingFields).map((state, i) => h('div', [
                h(Program, { key: i, ...state }),
                // h('pre', { style: { lineHeight: 1.4 } }, [JSON.stringify(state, null, 2)]),
            ])),
        }))
