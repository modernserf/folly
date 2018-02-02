import { Fragment } from 'react'
import h from 'react-hyperscript'
import { connect } from 'react-redux'
import { equals, compose } from 'ramda'
import styled from 'styled-components'
import { OverflowHandler } from './helpers'

const match = (key, opts) => opts[key] ? opts[key]() : h('span', ['UNKNOWN KEY:', key])

const condProp = (prop, ifTrue, ifFalse) => (props) => props[prop] ? ifTrue : ifFalse

const withPath = (key, prevPath, props) => ({ path: prevPath.concat(key), ...props })

// selectors

const isSelected = ({ cursor: { block, rule, holes: [hole] } }, { path: [_block, _rule, ...path] }) =>
    equals([block, rule, hole], [_block, _rule, path])

const isSelectedHeader = ({ cursor: { block, headerField, focus } }, { path: [_block], id }) =>
    equals([block, headerField, focus], [_block, id, 'header'])

const varName = ({ program: { children: blocks } }, { id, path: [block, rule] }) =>
    blocks[block].children[rule].freeVars[id] ||
    blocks[block].header.children[id].varName ||
    blocks[block].header.children[id].label ||
    `? ${id} ?`

const headerLabelAt = ({ program: { children: blocks } }, { block, rule }) =>
    blocks[block].header.children[rule].varName ||
    blocks[block].header.children[rule].label

// action creators
const selectBody = (dispatch, { path: [block, rule, ...path] }) => (e) =>
    dispatch({ type: 'selectBody', payload: { block, rule, path } })
const selectHeader = (dispatch, props) => (e) =>
    dispatch({ type: 'selectHeader', payload: { block: props.path[0], headerField: props.id } })

// decorators

const selectable = connect(
    (state, props) => ({
        isSelected: isSelected(state, props),
    }),
    (dispatch, props) => ({
        onClick: selectBody(dispatch, props),
    })
)

// Text element

const TextForm = compose(
    selectable,
    connect((state, props) => ({ children: props.label }))
)(styled.span`
    background-color: ${condProp('isSelected', 'rgba(0, 100, 0, 0.2)', 'none')};
`)

// Operator element

const SelectableOperator = styled.span`
    background-color: ${condProp('isSelected', 'rgba(0, 100, 0, 0.2)', 'none')};
`

const Operator = styled.span`
    display: inline-block;
    margin: 0 4px;
    font-family: 'Fira Code', monospace;
`

const OperatorForm = selectable(({ isSelected, onClick, path, operator, lhs, rhs }) =>
    h(SelectableOperator, { path }, [
        h(Form, withPath('lhs', path, lhs)),
        h(Operator, { onClick }, [operator]),
        h(Form, withPath('rhs', path, rhs)),
    ]))

// Var element

const VarForm = compose(
    selectable,
    connect((state, props) => ({
        children: varName(state, props),
    })),
)(styled.span`
    display: inline-block;
    background-color: ${condProp('isSelected', 'rgba(0, 100, 0, 0.2)', 'none')};
    color: ${condProp('isSelected', 'white', 'green')}
`)

// List element

const List = styled.span`
    background-color: ${condProp('isSelected', 'rgba(0, 100, 0, 0.2)', 'none')};
    display: inline-block;
`
const ListForm = selectable(({ isSelected, onClick, path, children, tail }) =>
    h(List, { isSelected }, [
        h('span', { onClick }, '['),
        children.map((props, i) => h(Fragment, { key: i }, [
            h(Form, withPath(['children', i], path, props)),
        ])),
        tail ? h('span', [
            h('span', { onClick }, ' | '),
            h(Form, withPath('tail', path, tail)),
        ]) : null,
        h('span', { onClick }, ']'),
    ]))

// Struct element

const Struct = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    background-color: ${condProp('isSelected', 'rgba(0, 100, 0, 0.2)', 'none')};
`

const StructEntry = styled.div`
    flex: 0 0 auto;
    display: flex;
    flex-direction: row;
    margin-right: 8px;
`

const StructLabel = connect((state, props) => ({
    children: `${headerLabelAt(state, props)}:`,
}))(styled.span`
    margin-right: 4px;
    display: inline-block;
    color: #888;
`)

const StructTableWrap = styled.table`
    line-height: 1.4;
    tr + tr td,
    tr + tr th {
        padding-top: 2px;
    }
    td {
        vertical-align: top;
        padding-left: 4px;
    }
    background-color: ${condProp('isSelected', 'rgba(0, 100, 0, 0.2)', 'none')};
`

const Head = connect((state, props) => ({
    children: `${headerLabelAt(state, props)}:`,
}))(styled.th`
    text-align: right;
    color: #888;
`)

const Value = styled.td`
    text-align: left;
`

const StructTable = ({ path, isSelected, onClick, id, children }) =>
    h(StructTableWrap, { isSelected }, [
        h('tbody', [
            ...children.map((value, i) =>
                h('tr', { key: i }, [
                    h(Head, { onClick, block: id, rule: i }),
                    h(Value, [h(Form, withPath(['children', i], path, value))]),
                ])
            ),
        ]),
    ])

const StructForm = selectable(({ path, isSelected, onClick, id, children }) => h(OverflowHandler, {
    fallback: h(StructTable, { path, isSelected, onClick, id, children }),
}, [
    h(Struct, { isSelected }, [
        ...children.map((value, i) =>
            h(StructEntry, { key: i }, [
                h(StructLabel, { onClick, block: id, rule: i }),
                h(Form, withPath(['children', i], path, value)),
            ])),
    ]),
]))

// Placeholder Element

const PlaceholderForm = selectable(styled.span`
    width: 1em;
    height: 1em;
    display: inline-block;
    border-radius: 100%;
    background-color: #ccf;
    border: ${condProp('isSelected', '2px solid green', 'none')};
`)

// Comment element

const Comment = styled.span`
    display: inline-block;
    background-color: ${condProp('isSelected', 'rgba(0, 100, 0, 0.2)', 'none')};
    &:after {
        content: "";
        position: absolute;
        bottom: 50%;
        left: 0;
        width: 100%;
        height: 100%;
        border-bottom: 4px solid rgba(200,0,0,0.3);
    }
`

const CommentInner = styled.span`
    user-select: none;
`

const CommentForm = connect(
    (state, props) => ({
        isSelected: isSelected(state, props),
    }),
)(({ path, body, isSelected }) => h(Comment, { isSelected }, [
    h(CommentInner, [ h(Form, { path, ...body }) ]),
]))

// Root element type

const Form = (props) => match(props.type, {
    text: () => h(TextForm, props),
    operator: () => h(OperatorForm, props),
    var: () => h(VarForm, props),
    list: () => h(ListForm, props),
    struct: () => h(StructForm, props),
    placeholder: () => h(PlaceholderForm, props),
    comment: () => h(CommentForm, props),
})

const RuleBlockWrap = styled.div`
    margin-bottom: 1em;
`

const RuleHeaderWrap = styled.div`
    color: white;
    background-color: #666;
`

const RuleHeaderCell = styled.span`
    margin: 8px;
    display: inline-block;
    text-decoration: ${condProp('isSelected', '#9c9 underline', 'none')};
`

const RuleHeaderVar = styled.span`
    color: #9c9;
    padding-left: 4px;
`

const RuleHeader = connect(
    (state, props) => ({
        isSelected: isSelectedHeader(state, props),
    }),
    (dispatch, props) => ({
        onClick: selectHeader(dispatch, props),
    })
)(({ id, path, label, varName, isSelected, onClick }) =>
    h(RuleHeaderCell, { isSelected, onClick }, [
        h('span', [label, ': ']),
        varName ? h(RuleHeaderVar, [varName]) : null,
    ]))

const RuleCase = styled.div`
    :nth-child(odd) {
        background-color: #eee;
    }
    border: 1px solid #eee;
    padding-bottom: 0.5em;
`

const RuleRow = styled.div`
    padding: 0.5em 0.5em 0;
`

const RuleBlock = ({ path, header, children }) =>
    h(RuleBlockWrap, [
        h(RuleHeaderWrap, [
            ...header.children.map(({ label, varName }, i) =>
                h(RuleHeader, { id: i, path, label, varName })
            ),
        ]),
        ...children.map(({ children, freeVars }, rule) =>
            h(RuleCase, children.map((props, line) =>
                h(RuleRow, { key: line }, [h(Form, withPath([rule, line], path, props))])
            ))
        ),
    ])

const Body = styled.div`
    font-family: 'Parc Place', sans-serif;
    font-size: 14px;
    color: #333;
`

export const Program = connect(
    (state) => ({ blocks: Object.values(state.program.children) })
)(({ blocks }) =>
    h(Body, {}, blocks.map((block) =>
        h(RuleBlock, { key: block.id, path: [block.id], ...block })
    )))
