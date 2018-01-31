import { Component } from 'react'
import h from 'react-hyperscript'
import { equals, over, lensPath, append, concat, flip } from 'ramda'
import styled from 'styled-components'

const match = (key, opts) => opts[key] ? opts[key]() : h('span', ['UNKNOWN KEY:', key])
const concatR = flip(concat)
const ctxPath = lensPath(['ctx', 'path'])

const isSelected = ({ block, rule, path, cursor }) =>
    block === cursor.block &&
    rule === cursor.rule &&
    equals(path, cursor.holes[0])

const Selectable = styled.span`
    background-color: ${({ ctx }) => isSelected(ctx) ? 'rgba(0, 100, 0, 0.2)' : 'none'};
`

const TextForm = ({ ctx, label }) =>
    h(Selectable, { ctx }, [label])

const Operator = styled.span`
    display: inline-block;
    margin: 0 4px;
    font-family: 'Fira Code', monospace;
`

const OperatorForm = ({ ctx, operator, lhs, rhs }) =>
    h(Selectable, { ctx }, [
        h(Form, over(ctxPath, append('lhs'), { ctx, ...lhs })),
        h(Operator, [operator]),
        h(Form, over(ctxPath, append('rhs'), { ctx, ...rhs })),
    ])

const varName = (ctx, id) => {
    if (ctx.freeVars[id]) { return ctx.freeVars[id] }
    const value = ctx.header.children.find((h) => h.id === id)
    if (!value) { throw new Error('undeclared var ' + id) }
    return value.varName || value.label
}

const Var = styled(Selectable)`
    display: inline-block;
    color: ${({ ctx }) => isSelected(ctx) ? 'white' : 'green'};
`
const VarForm = ({ ctx, id }) => h(Var, { ctx }, [varName(ctx, id)])

const List = styled(Selectable)`
    display: inline-block;
`
const ListForm = ({ ctx, children, tail }) =>
    h(List, { ctx }, [
        '[',
        ...children.map((props, i) =>
            h(Form, over(ctxPath, concatR(['children', i]), { key: i, ctx, ...props }))
        ),
        tail ? h('span', [
            ' | ',
            h(Form, over(ctxPath, append('tail'), { key: 'tail', ctx, ...tail }))])
            : null,
        ']',
    ])

const Struct = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
`

const StructEntry = styled.div`
    flex: 0 0 auto;
    display: flex;
    flex-direction: row;
    margin-right: 8px;
`

const StructLabel = styled.span`
    margin-right: 4px;
    display: inline-block;
    color: #888;
`

class OverflowHandler extends Component {
    state = {
        overflowState: 'init', // init | normal | overflow
    }
    componentDidMount () {
        this.checkOverflow()
    }
    componentDidUpdate () {
        this.checkOverflow()
    }
    checkOverflow () {
        const isOverflowing = this.el.offsetWidth < this.el.scrollWidth
        const nextState = isOverflowing ? 'overflow' : 'normal'
        if (this.state.overflowState !== nextState) {
            this.setState({ overflowState: nextState })
        }
    }
    setRef = (el) => { this.el = el }
    render () {
        const { overflowState } = this.state
        const { children, fallback } = this.props
        return h('div', { ref: this.setRef, style: { overflow: 'hidden' } }, [
            h('div', { style: { opacity: 0, position: 'absolute' } }, [children]),
            overflowState === 'normal' && children,
            overflowState === 'overflow' && fallback,
        ])
    }
}

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
`

const Head = styled.th`
    text-align: right;
    color: #888;
`

const Value = styled.td`
    text-align: left;
`

const headerLabelAt = (ctx, id, i) => ctx.ruleHeaders[id].children[i].label

const StructTable = ({ ctx, id, children }) =>
    h(StructTableWrap, [
        h('tbody', [
            ...children.map((value, i) =>
                h('tr', { key: i }, [
                    h(Head, [headerLabelAt(ctx, id, i), ':']),
                    h(Value, [h(Form, { ctx, ...value })]),
                ])
            ),
        ]),
    ])

const StructForm = ({ ctx, id, children }) => h(OverflowHandler, {
    fallback: h(StructTable, { ctx, id, children }),
}, [
    h(Struct, [
        ...children.map((value, i) =>
            h(StructEntry, { key: i }, [
                h(StructLabel, [headerLabelAt(ctx, id, i), ':']),
                h(Form, over(ctxPath, concatR(['children', i]), { ctx, ...value })),
            ])),
    ]),
])

const PlaceholderForm = styled.span`
    width: 1em;
    height: 1em;
    display: inline-block;
    border-radius: 100%;
    background-color: #ccf;
    border: ${({ ctx }) => isSelected(ctx) ? '2px solid green' : 'none'};
`

const Comment = styled.span`
    display: inline-block;
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

const CommentForm = ({ ctx, body }) =>
    h(Comment, [h(Form, { ctx, ...body })])

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

const isSelectedHeader = ({ ctx, headerField }) =>
    ctx.cursor.block === ctx.block &&
    ctx.cursor.headerField === headerField &&
    ctx.cursor.focus === 'header'

const RuleHeader = styled.div`
    color: white;
    background-color: #666;
`

const RuleHeaderCell = styled.span`
    margin: 8px;
    display: inline-block;
    text-decoration: ${(props) => isSelectedHeader(props) ? '#9c9 underline' : 'none'};
`

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

const RuleHeaderVar = styled.span`
    color: #9c9;
    padding-left: 4px;
`
const RuleBlock = ({ ctx, header, children }) =>
    h(RuleBlockWrap, [
        h(RuleHeader, [
            ...header.children.map(({ id, label, varName }, i) =>
                h(RuleHeaderCell, { ctx, headerField: i }, [
                    label || '  ', // &nbsp
                    ':',
                    varName ? h(RuleHeaderVar, [varName]) : null,
                ])
            ),
        ]),
        ...children.map(({ id, children, freeVars }, rule) =>
            h(RuleCase, children.map((props, i) =>
                h(RuleRow, [h(Form, {
                    key: i,
                    ctx: { ...ctx, header, freeVars, rule, path: [i] },
                    ...props,
                }) ]))
            )
        ),
    ])

const getRules = (program) =>
    program.children.reduce((m, rule) => Object.assign(m, { [rule.id]: rule.header }), {})

export const Program = ({ program, cursor }) =>
    h('div', {}, program.children.map((block, i) =>
        h(RuleBlock, {
            key: block.id,
            ctx: { block: i, cursor, ruleHeaders: getRules(program) },
            ...block,
        })))
