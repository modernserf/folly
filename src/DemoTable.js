import { Component } from 'react'
import h from 'react-hyperscript'
import styled from 'styled-components'

const match = (key, opts) => opts[key]()

const Table = styled.table`
    width: 100%;
    margin-bottom: 1em;
    border: 1px solid #eee;
`

const RowGroup = styled.tbody`
    :nth-child(odd) {
        background-color: #eee;
    }
    th, td {
        padding: 0.2em 0.3em;
    }
    td {
        width: 100%;
        vertical-align: top;
    }
    tr:first-child {
        th, td {
            padding-top: 0.5em;
        }
    }
    tr:last-child {
        th, td {
            padding-bottom: 0.5em;
        }
    }
`

const Head = styled.th`
    text-align: right;
    color: #888;
`

const Value = styled.td`
    text-align: left;
`

const Fact = ({ header, data: { values } }) =>
    h(RowGroup, [
        ...header.children.map(({ id, label }) =>
            h('tr', { key: id }, [
                h(Head, [label, ':']),
                h(Value, [
                    values[id] ? h(Form, values[id]) : null,
                ]),
            ])
        ),
    ])

const FactBlock = ({ header, children }) =>
    h(Table, [
        ...children.map((row, i) =>
            h(Fact, { key: row.id, index: i, header, data: row })),
    ])

const TextForm = ({ label }) => h('span', [label])

const Operator = styled.span`
    display: inline-block;
    margin: 0 4px;
    font-family: 'Fira Code', monospace;
`
const OperatorForm = ({ operator, lhs, rhs }) =>
    h('span', [ h(Form, lhs), h(Operator, [operator]), h(Form, rhs) ])

const Var = styled.span`
    display: inline-block;
    color: green;
`
const VarForm = ({ label }) => h(Var, [label])

const List = styled.span`
    display: inline-block;
`
const ListForm = ({ children, tail }) =>
    h(List, [
        '[',
        ...children.map((props, i) => h(Form, { key: i, ...props })),
        tail ? h('span', [' | ', h(Form, { key: 'tail', ...tail })]) : null,
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

const StructTable = ({ children }) =>
    h(StructTableWrap, [
        h('tbody', [
            ...children.map(([header, value], i) =>
                h('tr', { key: header.id }, [
                    h(Head, [header.label, ':']),
                    h(Value, [h(Form, value)]),
                ])
            ),
        ]),
    ])

const StructForm = ({ children }) => h(OverflowHandler, {
    fallback: h(StructTable, { children }),
}, [
    h(Struct, [
        ...children.map(([header, value], i) =>
            h(StructEntry, { key: i }, [
                h(StructLabel, [header.label, ':']),
                h(Form, value),
            ])),
    ]),
])

const PlaceholderForm = styled.span`
    width: 1em;
    height: 1em;
    display: inline-block;
    border-radius: 1em;
    background-color: #ccf;
`

const Form = (props) => match(props.type, {
    text: () => h(TextForm, props),
    operator: () => h(OperatorForm, props),
    var: () => h(VarForm, props),
    list: () => h(ListForm, props),
    struct: () => h(StructForm, props),
    placeholder: () => h(PlaceholderForm, props),
})

const RuleBlockWrap = styled.div`
    margin-bottom: 1em;
`

const RuleHeader = styled.div`
    color: white;
    background-color: #666;
`

const RuleHeaderCell = styled.span`
    margin: 8px;
    display: inline-block;
`

const RuleCase = styled.div`
    :nth-child(odd) {
        background-color: #eee;
    }
    border: 1px solid #eee;
`

const RuleRow = styled.div`
    margin: 0.8em 0.5em;
`

const RuleHeaderVar = styled.span`
    display: inline-block;
    color: #9c9;
    padding-left: 4px;
`
const RuleBlock = ({ header, children }) =>
    h(RuleBlockWrap, [
        h(RuleHeader, [
            ...header.children.map(({ id, label, varName }) =>
                h(RuleHeaderCell, [
                    label,
                    ':',
                    varName ? h(RuleHeaderVar, [varName]) : null,
                ])
            ),
        ]),
        ...children.map(({ id, children }) =>
            h(RuleCase, children.length
                ? children.map((props, i) =>
                    h(RuleRow, [ h(Form, { key: i, ...props }) ]))
                : [h(RuleRow, [ h(PlaceholderForm) ])]
            )
        ),
    ])

const Block = (props) => match(props.type, {
    factBlock: () => h(FactBlock, props),
    ruleBlock: () => h(RuleBlock, props),
})

export const Program = ({ program }) =>
    h('div', {}, program.children.map((block) =>
        h(Block, { key: block.id, ...block })))
