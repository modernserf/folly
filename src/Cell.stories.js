import { Fragment } from 'react'
import h from 'react-hyperscript'
import styled from 'styled-components'
import { storiesOf } from '@storybook/react'
import { DevContainer } from './story'
import { ContentEditable } from './helpers'

const match = (value, opts) => opts[value]()

const TextCell = styled(({ value, ...props }) =>
    h('p', props, [value]))`
    padding: 0.5em 0.5em 0.25em;
    line-height: 1.4;
`

const DisabledTextCell = styled(TextCell)`
    color: #999;
`

const InvalidTextCell = styled(TextCell)`
    color: #c00;
`

const EditTextCellContainer = styled.div`
    padding: 0.5em 0.5em calc(0.25em - 2px);
`

const EditTextCellField = styled(ContentEditable)`
    border-bottom: 2px solid #CCC;
`

const EditTextCell = ({ value, ...props }) => h(EditTextCellContainer, props, [
    h(EditTextCellField, { value }),
])

const NumberCell = styled(({ value, ...props }) =>
    h('p', props, [value]))`
    padding: 0.5em 0.5em 0.25em;
    line-height: 1.4;
    text-align: right;
    font-family: monospace;
`

const EditNumberCellField = styled.input`
    font-size: inherit;
    font-family: monospace;
    border: none;
    padding: 0;
    width: 100%;
    border-bottom: 2px solid #CCC;
`

const tryNumber = (x) => Number.isFinite(Number(x)) ? Number(x) : x

const EditNumberCell = ({ value, onChange = () => {}, ...props }) => h(EditTextCellContainer, props, [
    h(EditNumberCellField, {
        type: 'number',
        value,
        onChange: (e) => onChange(tryNumber(e.target.value), e) }),
])

const DisabledNumberCell = styled(NumberCell)`
    color: #999;
`

const InvalidNumberCell = styled(NumberCell)`
    color: #c00;
`

const EditRefCellContainer = styled.div`
    border: 2px solid #CCC;
    border-radius: 1em;
`

const EditRefCell = ({ value }) => h(EditRefCellContainer, [
    h(Cell, { ...value, viewState: 'view' }),
])

const Flex = styled.div`
    display: flex;
    align-items: baseline;
`

const Paren = styled.span`
    padding: 0 0.25em;
`

const TupleCell = ({ fields }) => h(Flex, [
    h(Paren, ['(']),
    ...fields.map(({ id, value, viewState }) => h(Cell, { key: id, ...value, viewState })),
    h(Paren, [')']),
])

const RecordCell = ({ fields, format }) => h(Flex, [
    h(Paren, ['(']),
    ...format.labels.map(({ id, label }, i) => h(Fragment, { key: id }, [
        h('span', [label, ':']),
        h(Cell, { ...fields[i].value, viewState: fields[i].viewState }),
    ])),
    h(Paren, [')']),
])

const StructCell = ({ format, fields }) => match(format.id, {
    tuple: () => h(TupleCell, { fields }),
    record: () => h(RecordCell, { fields, format }),
})

const Cell = ({ type, value, viewState }) => match(`${type}_${viewState}`, {
    text_view: () => h(TextCell, { value }),
    text_edit: () => h(EditTextCell, { value }),
    text_disabled: () => h(DisabledTextCell, { value }),
    text_invalid: () => h(InvalidTextCell, { value }),

    number_view: () => h(NumberCell, { value }),
    number_edit: () => h(EditNumberCell, { value }),
    number_disabled: () => h(DisabledNumberCell, { value }),
    number_invalid: () => h(InvalidNumberCell, { value }),
    number_invalidNumber: () => h(InvalidTextCell, { value }),

    ref_view: () => h(Cell, { ...value, viewState }),
    ref_edit: () => h(EditRefCell, { value }),
    ref_disabled: () => h(Cell, { ...value, viewState }),
    ref_invalid: () => h(Cell, { ...value, viewState }),

    struct_view: () => h(StructCell, value),
})

const textCell = { id: 'park', type: 'text', value: 'Park Street' }
const numberCell = { id: 'num', type: 'number', value: 123.45 }

const tuple = (...values) => ({
    format: { id: 'tuple' },
    fields: values.map((v, i) => ({ id: String(i), value: v, viewState: 'view' })),
})

const record = (...pairs) => ({
    format: { id: 'record', labels: pairs.map(([k]) => ({ id: k, label: k })) },
    fields: pairs.map(([k, v]) => ({ id: k, value: v, viewState: 'view' })),
})

storiesOf('Cell', module)
    .add('text cell', () => h(DevContainer, { width: '200px' }, [
        h('h2', 'view'),
        h(Cell, { ...textCell, viewState: 'view' }),
        h('h2', 'edit'),
        h(Cell, { ...textCell, viewState: 'edit' }),
        h('h2', 'disabled'),
        h(Cell, { ...textCell, viewState: 'disabled' }),
        h('h2', 'invalid'),
        h(Cell, { ...textCell, viewState: 'invalid' }),
    ]))
    .add('number cell', () => h(DevContainer, { width: '200px' }, [
        h('h2', 'view'),
        h(Cell, { ...numberCell, viewState: 'view' }),
        h('h2', 'edit'),
        h(Cell, { ...numberCell, viewState: 'edit' }),
        h('h2', 'disabled'),
        h(Cell, { ...numberCell, viewState: 'disabled' }),
        h('h2', 'invalid'),
        h(Cell, { ...numberCell, viewState: 'invalid' }),
        h('h2', 'not a number'),
        h(Cell, { ...numberCell, value: 'Butts', viewState: 'invalidNumber' }),
    ]))
    .add('ref cell', () => h(DevContainer, { width: '200px' }, [
        h('h2', 'ref of text'),
        h(Cell, { type: 'ref', value: textCell, viewState: 'view' }),
        h('h2', 'ref of number'),
        h(Cell, { type: 'ref', value: numberCell, viewState: 'view' }),
        h('h2', 'edit'),
        h(Cell, { type: 'ref', value: textCell, viewState: 'edit' }),
        h('h2', 'disabled'),
        h(Cell, { type: 'ref', value: textCell, viewState: 'disabled' }),
        h('h2', 'invalid'),
        h(Cell, { type: 'ref', value: textCell, viewState: 'invalid' }),
    ]))
    .add('struct cell', () => h(DevContainer, { width: '300px' }, [
        h('h2', '2-tuple'),
        h(Cell, {
            type: 'struct',
            value: tuple(textCell, numberCell),
            viewState: 'view',
        }),
        h('h2', 'named fields'),
        h(Cell, {
            type: 'struct',
            value: record(['From', textCell], ['To', { id: 'south', type: 'text', value: 'South Station' }]),
            viewState: 'view',
        }),
        h('h2', 'nested records'),
        h(Cell, {
            type: 'struct',
            value: record(
                ['Foo', {
                    type: 'struct',
                    value: record(['Quux', { type: 'ref', value: textCell, viewState: 'view' }]),
                    viewState: 'view',
                }],
                ['Bar', {
                    type: 'struct',
                    value: tuple(textCell, numberCell),
                    viewState: 'view',
                }]
            ),
            viewState: 'view',
        }),
    ]))
