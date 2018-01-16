import h from 'react-hyperscript'
import styled from 'styled-components'
import { storiesOf } from '@storybook/react'
import { DevContainer } from './story'

const dataTableColor = '#060'

const HeaderField = styled.th`
    background-color: ${dataTableColor};
    color: white;
    padding: 0.5em;
    text-align: left;
`

const HeaderItem = ({ label, type }) =>
    h(HeaderField, [label, ' : ', type.label])

const Header = ({ columns }) =>
    h('tr', columns.map(({ id, label, type }) =>
        h(HeaderItem, { key: id, label, type })
    ))

const Section = styled.table`
    width: 100%;
    border: 1px solid ${dataTableColor};
    background-color: white;
    line-height: 1.4;
`

const DataTable = ({ columns, rows }) => h(Section, [
    h(Header, { columns }),
    ...rows.map(({ id, fields }) => h('tr', { key: id },
        columns.map((col) => h('td', [fields[col.id].label])))),
])

const get = (arr, id) => arr.find((x) => x.id === id)

const types = [
    { id: 'station', label: 'Station' },
    { id: 'line', label: 'Line' },
]

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
    type: get(types, 'station'),
}))

const lines = [
    { id: 'red', label: 'Red' },
    { id: 'green', label: 'Green' },
    { id: 'blue', label: 'Blue' },
    { id: 'orange', label: 'Orange' },
].map((s) => ({
    ...s,
    type: get(types, 'line'),
}))

const columns = [
    { id: 'from', label: 'From', type: get(types, 'station') },
    { id: 'to', label: 'To', type: get(types, 'station') },
    { id: 'line', label: 'Line', type: get(types, 'line') },
]

const row = (from, to, line) => ({ from: get(stations, from), to: get(stations, to), line: get(lines, line) })

const rows = [
    { fields: row('park', 'downtown', 'red') },
    { fields: row('downtown', 'south', 'red') },
    { fields: row('haymarket', 'govt', 'green') },
    { fields: row('govt', 'park', 'green') },
    { fields: row('haymarket', 'state', 'orange') },
    { fields: row('state', 'downtown', 'orange') },
    { fields: row('govt', 'state', 'blue') },
    { fields: row('state', 'aquarium', 'blue') },
].map((s, i) => ({
    ...s,
    id: i.toString(),
}))

storiesOf('DataTable', module)
    .add('normal', () => (
        h(DevContainer, [
            h(DataTable, { columns, rows }),
        ])
    ))
