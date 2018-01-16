import PropTypes from 'prop-types'
import h from 'react-hyperscript'
import styled from 'styled-components'
import { storiesOf } from '@storybook/react'
import { DevContainer } from './story'

export const schema = (() => {
    const Types = Object.entries(PropTypes)
        .map(([k, v]) => [k, v.isRequired || v])
        .reduce((m, [k, v]) => Object.assign(m, { [k]: v }), {})

    // schema
    const id = Types.string
    const label = Types.string
    const options = Types.arrayOf(Types.shape({ id, label }))
    const items = Types.arrayOf(Types.shape({ id }))
    const viewState = Types.oneOf(['view', 'disabled', 'invalid', 'edit'])

    return { id, label, options, items, viewState }
})()

const List = ({ items, children, ...props }) =>
    h('ul', props, items.map((d, i) =>
        h('li', { key: d.id }, children(d, i))))

const match = (value, opts) => opts[value]()

const textTableColor = '#009'

const Section = styled.section`
    border: 1px solid ${textTableColor};
    background-color: white;
    line-height: 1.4;
`

const Header = styled.h1`
    background-color: ${textTableColor};
    color: white;
    padding: 0.5em;
`

const TableRowLabel = styled.p`
    padding: 0.5em 0.5em 0.25em;
`

const DisabledTableRowLabel = styled(TableRowLabel)`
    color: #999;
`

const InvalidTableRowLabel = styled(TableRowLabel)`
    color: #c00;
`

const EditTableRowContainer = styled.div`
    padding: 0.5em 0.5em calc(0.25em - 2px);
`

const ContentEditable = (props) => h('div', { contentEditable: true, ...props })

const EditTableRowField = styled(ContentEditable)`
    border-bottom: 2px solid #CCC;
`

const EditTableRow = ({ label }) => h(EditTableRowContainer, [
    h(EditTableRowField, [label]),
])

const TableRow = ({ label, viewState }) => match(viewState, {
    view: () => h(TableRowLabel, [label]),
    disabled: () => h(DisabledTableRowLabel, [label]),
    invalid: () => h(InvalidTableRowLabel, [label]),
    edit: () => h(EditTableRow, { label }),
})

const TextTable = ({ label, items }) => h(Section, [
    h(Header, [label]),
    h(List, { items }, (props) =>
        h(TableRow, props)),
])

const stations = [
    { id: 'park', label: 'Park Street' },
    { id: 'downtown', label: 'Downtown Crossing' },
    { id: 'south', label: 'South Station' },
    { id: 'haymarket', label: 'Haymarket' },
    { id: 'govt', label: 'Government Center' },
    { id: 'state', label: 'State Street' },
    { id: 'aquarium', label: 'Aquarium' },
].map((s) => ({
    ...s,
    viewState: 'view',
}))

const stationsWithDisabled = stations.map((s) => ({
    ...s,
    viewState: ['haymarket', 'state'].includes(s.id) ? 'disabled' : 'view',
}))

const stationsWithDuplicate = stations.concat([{
    id: 'aquarium-2', label: 'Aquarium', viewState: 'invalid',
}])

const stationsWithEdit = stations.map((s) => ({
    ...s,
    viewState: s.id === 'govt' ? 'edit' : 'view',
}))

storiesOf('TextTable', module)
    .add('normal', () => (
        h(DevContainer, [
            h(TextTable, { label: 'Station', items: stations }),
        ])
    ))
    .add('disabled items', () => (
        h(DevContainer, [
            h(TextTable, { label: 'Station', items: stationsWithDisabled }),
        ])
    ))
    .add('duplicate item', () => (
        h(DevContainer, [
            h(TextTable, { label: 'Station', items: stationsWithDuplicate }),
        ])
    ))
    .add('editing item', () => (
        h(DevContainer, [
            h(TextTable, { label: 'Station', items: stationsWithEdit }),
        ])
    ))
