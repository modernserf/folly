import h from 'react-hyperscript'
import { last } from 'ramda'
import styled from 'styled-components'
import { storiesOf } from '@storybook/react'
import { Player, Range } from './story'
import { Program } from './DemoTable'

import { reducer, program, ruleBlock, header, ruleCase, varr, text, op, eq, struct, list, comment } from './data'

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

const dataRulesOnly = {
    program: program(
        ruleBlock(
            [header('Station')],
            ruleCase(eq('Station', text('Park Street'))),
            ruleCase(eq('Station', text('Downtown Crossing'))),
            ruleCase(eq('Station', text('Govt Center')))
        ),
        ruleBlock(
            [header('From'), header('To'), header('Line')],
            ruleCase(
                eq('From', text('Park Street')),
                eq('To', text('Downtown Crossing')),
                eq('Line', text('Red')),
            ),
            ruleCase(
                eq('From', text('Park Street')),
                eq('To', text('Govt Center')),
                eq('Line', text('Green')),
            ),
            ruleCase(
                eq('From', text('State Street')),
                eq('To', text('Downtown Crossing')),
                eq('Line', text('Orange')),
            ),
        ),
        ruleBlock(
            [header('Item'), header('Not in', 'List')],
            ruleCase(
                op('==', varr('List'), list())
            ),
            ruleCase(
                op('==', varr('List'), list([varr('First')], varr('Rest'))),
                op('!=', varr('Item'), varr('First')),
                struct(
                    [header('Item'), varr('Item')],
                    [header('Not in'), varr('Rest')]
                )
            )
        ),
        ruleBlock(
            [header('From'), header('To'), header('Path')],
            ruleCase(
                comment(op('==', varr('From'), varr('Path'))),
                op('==', varr('From'), varr('To')),
                op('==', varr('Path'), list())
            ),
            ruleCase(
                op('==', varr('Path'), list([varr('Link')], varr('Rest'))),
                struct(
                    [header('From'), varr('From')],
                    [header('To'), varr('Next')],
                    [header('Link'), varr('Link')]
                ),
                struct(
                    [header('Item'), varr('Link')],
                    [header('Not in'), varr('Rest')],
                ),
                struct(
                    [header('From'), varr('Next')],
                    [header('To'), varr('To')],
                    [header('Path'), varr('Rest')]
                )
            )
        )
    ),
}

const dispatch = (type, payload) => (state) => reducer(state, { type, payload })

const ruleFrames = [
    dispatch('appendBlock'),

    dispatch('setHeader', 'Item'),
    dispatch('appendHeaderField'),
    dispatch('setHeader', 'Not in'),
    dispatch('setHeaderVar', 'List'),

    dispatch('appendRuleCase'),
    dispatch('addOperator', '=='),
    dispatch('addVar', 'List'),
    dispatch('addEmptyList'),

    dispatch('appendRuleCase'),
    dispatch('addOperator', '=='),
    dispatch('addVar', 'List'),
    dispatch('addConsList'),
    dispatch('addVar', 'First'),
    dispatch('addVar', 'Rest'),

    dispatch('appendRuleLine'),
    dispatch('addOperator', '!='),
    dispatch('addVar', 'Item'),
    dispatch('addVar', 'First'),

    dispatch('appendRuleLine'),
    dispatch('addStruct', ['Item', 'Not in']),
    dispatch('addVar', 'Item'),
    dispatch('addVar', 'Rest'),
]

const factsAsRules = [
    dispatch('appendBlock'),

    dispatch('setHeader', 'From'),
    dispatch('appendHeaderField'),
    dispatch('setHeader', 'To'),
    dispatch('appendHeaderField'),
    dispatch('setHeader', 'Line'),

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
        program: program(
            ruleBlock(
                [header('Item'), header('Not in', 'List')],
                ruleCase(
                    op('==', varr('Not in'), list())
                ),
                ruleCase(
                    op('==', varr('List'), list([varr('First')], varr('Rest'))),
                    op('!=', varr('Item'), varr('First')),
                    struct(
                        [header('Item'), varr('Item')],
                        [header('Not in'), varr('Rest')]
                    )
                )
            )
        ),
    }),
    dispatch('selectBody', { block: 0, rule: 1, path: [1] }),
    dispatch('commentOut'),
    dispatch('selectHeader', { block: 0, headerField: 1 }),
    dispatch('setHeaderVar', 'Items'),
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
    .add('table', () =>
        h(Container, [
            h(Program, dataRulesOnly),
        ]))
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
