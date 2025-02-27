/* eslint-env jest */
import { sandbox } from 'development-sandbox'
import { FileRef, nextTestSetup } from 'e2e-utils'
import { outdent } from 'outdent'
import path from 'path'

describe('Error overlay for hydration errors (React 19)', () => {
  const { next } = nextTestSetup({
    files: new FileRef(path.join(__dirname, 'fixtures', 'default-template')),
    skipStart: true,
    dependencies: {
      react: '19.0.0-rc-7771d3a7-20240827',
      'react-dom': '19.0.0-rc-7771d3a7-20240827',
    },
  })

  it('should show correct hydration error when client and server render different text', async () => {
    const { cleanup, session, browser } = await sandbox(
      next,
      new Map([
        [
          'index.js',
          outdent`
              const isClient = typeof window !== 'undefined'
              export default function Mismatch() {
                  return (
                    <div className="parent">
                      <main className="child">{isClient ? "client" : "server"}</main>
                    </div>
                  );
                }
            `,
        ],
      ])
    )

    await session.assertHasRedbox()

    expect(await session.getRedboxDescription()).toMatchInlineSnapshot(`
        "Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used
        See more info here: https://nextjs.org/docs/messages/react-hydration-error"
      `)
    expect(await session.getRedboxDescriptionWarning()).toMatchInlineSnapshot(`
        "- A server/client branch \`if (typeof window !== 'undefined')\`.
        - Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
        - Date formatting in a user's locale which doesn't match the server.
        - External changing data without sending a snapshot of it along with the HTML.
        - Invalid HTML tag nesting.

        It can also happen if the client has a browser extension installed which messes with the HTML before React loaded."
      `)

    await session.patch(
      'index.js',
      outdent`
      export default function Mismatch() {
          return (
            <div className="parent">
              <main className="child">Value</main>
            </div>
          );
        }
    `
    )

    await session.assertNoRedbox()

    expect(await browser.elementByCss('.child').text()).toBe('Value')

    await cleanup()
  })
})
