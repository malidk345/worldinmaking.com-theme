const mermaidShim = {
  initialize: (_config?: any) => {},
  render: async (_id: string, code: string) => ({
    svg: `<div style="padding: 0.75rem; background: rgba(0,0,0,0.03); border-radius: 6px; font-family: monospace; font-size: 13px;">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`,
  }),
}

export default mermaidShim
