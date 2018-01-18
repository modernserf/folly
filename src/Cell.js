import { Fragment } from 'react'
import h from 'react-hyperscript'
import styled from 'styled-components'
import { connect } from 'react-redux'
import { ContentEditable } from './helpers'

const match = (value, opts) => opts[value]()

const BaseTextCell = ({ value, dispatch, ...props }) =>
    h('p', { ...props, onClick: () => dispatch({ type: 'cell_selected' }) }, [value])

const TextCell = styled(BaseTextCell)`
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

const EditTextCell = ({ value, dispatch, ...props }) => h(EditTextCellContainer, props, [
    h(EditTextCellField, {
        value,
        onChange: (payload) => dispatch({ type: 'cell_changed', payload }),
    }),
])

const NumberCell = styled(BaseTextCell)`
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

const tryNumber = (x) => Number.isFinite(Number(x))
    ? { status: 'ok', value: Number(x) }
    : { status: 'error', value: x }

const EditNumberCell = ({ value, dispatch, ...props }) => h(EditTextCellContainer, props, [
    h(EditNumberCellField, {
        type: 'number',
        value,
        onChange: (e) => dispatch({ type: 'cell_changed_validated', payload: tryNumber(e.target.value) }),
    }),
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

const EditRefCell = ({ value, dispatch }) => h(EditRefCellContainer, [
    h(BaseCell, { ...value, viewState: 'view', dispatch }),
])

const Flex = styled.div`
    display: flex;
    align-items: baseline;
`

const Paren = styled.span`
    padding: 0 0.25em;
`

const TupleCell = ({ fields, dispatch }) => h(Flex, [
    h(Paren, ['(']),
    ...fields.map(({ id, value, viewState }) => h(BaseCell, { key: id, ...value, viewState, dispatch })),
    h(Paren, [')']),
])

const RecordCell = ({ fields, format, dispatch }) => h(Flex, [
    h(Paren, ['(']),
    ...format.labels.map(({ id, label }, i) => h(Fragment, { key: id }, [
        h('span', [label, ':']),
        h(BaseCell, { ...fields[i].value, viewState: fields[i].viewState, dispatch }),
    ])),
    h(Paren, [')']),
])

const StructCell = ({ format, fields, dispatch }) => match(format.id, {
    tuple: () => h(TupleCell, { fields, dispatch }),
    record: () => h(RecordCell, { fields, format, dispatch }),
})

const noop = () => {}
export const BaseCell = ({ type, value, viewState, dispatch = noop }) => match(`${type}_${viewState}`, {
    text_view: () => h(TextCell, { value, dispatch }),
    text_edit: () => h(EditTextCell, { value, dispatch }),
    text_disabled: () => h(DisabledTextCell, { value, dispatch }),
    text_invalid: () => h(InvalidTextCell, { value, dispatch }),

    number_view: () => h(NumberCell, { value, dispatch }),
    number_edit: () => h(EditNumberCell, { value, dispatch }),
    number_disabled: () => h(DisabledNumberCell, { value, dispatch }),
    number_invalid: () => h(InvalidNumberCell, { value, dispatch }),
    number_invalidNumber: () => h(InvalidTextCell, { value, dispatch }),

    ref_view: () => h(BaseCell, { ...value, viewState, dispatch }),
    ref_edit: () => h(EditRefCell, { value, dispatch }),
    ref_disabled: () => h(BaseCell, { ...value, viewState, dispatch }),
    ref_invalid: () => h(BaseCell, { ...value, viewState, dispatch }),

    struct_view: () => h(StructCell, { ...value, dispatch }),
})

export default connect(
    (state, { id }) => state.pull(id, ['type', 'value', 'viewState']),
    (dispatch, { id }) => ({ dispatch: (action) => dispatch({ type: 'cell_action', payload: { id, action } }) }),
)(BaseCell)
