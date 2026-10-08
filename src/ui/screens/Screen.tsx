import { joining, sorry } from '../../net/pairing'
import { screen } from '../../state/router'
import { incoming, outgoing } from '../../transfer/manager'
import { Home } from './Home'
import { Connecting } from './Connecting'
import { Password } from './Password'
import { Sorry } from './Sorry'
import { Settings } from './Settings'
import { Done } from './Done'
import { Progress } from './Progress'

export function Screen() {
  if (sorry.value) return <Sorry />
  const j = joining.value
  if (j?.step === 'password') return <Password />
  if (j) return <Connecting />
  const o = outgoing.value?.snap.value
  if (o?.state === 'offered' || o?.state === 'sending') return <Progress />
  if (o?.state === 'done' && o.text === null) return <Done />
  const i = incoming.value?.snap.value
  if (i?.state === 'receiving') return <Progress />
  if (i?.state === 'done' && i.text === null) return <Done />
  return screen.value === 'settings' ? <Settings /> : <Home />
}
