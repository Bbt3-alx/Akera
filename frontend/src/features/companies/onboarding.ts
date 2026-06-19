import type {
  CompanyTransferWorkflow,
  CreateCompanyPayload,
  TransferWorkflowSelection,
} from './types.ts'

export function toCreateCompanyPayload(
  values: CreateCompanyPayload & {
    transferWorkflowSelection?: TransferWorkflowSelection
  },
): CreateCompanyPayload {
  const payload: CreateCompanyPayload = {
    name: values.name,
    address: values.address,
    contact: values.contact,
    baseCurrency: values.baseCurrency,
    businessType: values.businessType,
  }

  if (values.businessType === 'transfer') {
    payload.transferWorkflows = getTransferWorkflowsForSelection(
      values.transferWorkflowSelection,
    )
  }

  return payload
}

function getTransferWorkflowsForSelection(
  selection: TransferWorkflowSelection = 'correspondent_collection',
): CompanyTransferWorkflow[] {
  if (selection === 'both') {
    return ['correspondent_collection', 'remote_agent_payout']
  }

  return [selection]
}
