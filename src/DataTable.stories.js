import h from 'react-hyperscript'
import styled from 'styled-components'
import { storiesOf } from '@storybook/react'
import { DevContainer } from './story'
import { BaseCell } from './Cell'

const dataTableColor = '#060'

const HeaderField = styled.th`
    background-color: ${dataTableColor};
    color: white;
    padding: 0.5em;
    text-align: left;
`

const HeaderItem = ({ label }) =>
    h(HeaderField, [label])

const Header = ({ columns }) =>
    h('tr', columns.map(({ id, label }) =>
        h(HeaderItem, { key: id, label })
    ))

const Section = styled.table`
    width: 100%;
    border: 1px solid ${dataTableColor};
    background-color: white;
    line-height: 1.4;
`

const DataTable = ({ columns, rows }) => h(Section, [
    h('tbody', [
        h(Header, { columns }),
        ...rows.map((fields, i) => h('tr', { key: i },
            columns.map((col) => h('td', [
                h(BaseCell, fields[col.id]),
            ])))),
    ]),
])

const get = (arr, id) => arr.find((x) => x.id === id)

const stations = [
    { id: 'park', value: 'Park Street' },
    { id: 'downtown', value: 'Downtown Crossing' },
    { id: 'south', value: 'South Station' },
    { id: 'haymarket', value: 'Haymarket' },
    { id: 'govt', value: 'Government Center' },
    { id: 'state', value: 'State Street' },
    { id: 'aquarium', value: 'Aquarium' },
].map((s) => ({
    ...s,
    type: 'text',
    viewState: 'view',
}))

const lines = [
    { id: 'red', value: 'Red' },
    { id: 'green', value: 'Green' },
    { id: 'blue', value: 'Blue' },
    { id: 'orange', value: 'Orange' },
].map((s) => ({
    ...s,
    type: 'text',
    viewState: 'view',
}))

const columns = [
    { id: 'from', label: 'From' },
    { id: 'to', label: 'To' },
    { id: 'line', label: 'Line' },
]

const row = (from, to, line) => ({ from: get(stations, from), to: get(stations, to), line: get(lines, line) })
const rows = [
    row('park', 'downtown', 'red'),
    row('downtown', 'south', 'red'),
    row('haymarket', 'govt', 'green'),
    row('govt', 'park', 'green'),
    row('haymarket', 'state', 'orange'),
    row('state', 'downtown', 'orange'),
    row('govt', 'state', 'blue'),
    row('state', 'aquarium', 'blue'),
]

storiesOf('DataTable', module)
    .add('normal', () => (
        h(DevContainer, [
            h(DataTable, { columns, rows }),
        ])
    ))
