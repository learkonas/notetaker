export interface Skill<Ctx, Input, Output> {
  name: string;
  run(ctx: Ctx, input: Input): Promise<Output>;
}

export async function runPipeline<Ctx, T>(
  ctx: Ctx,
  skills: Skill<Ctx, unknown, unknown>[],
  initialInput: T,
): Promise<unknown> {
  let current: unknown = initialInput;
  for (const skill of skills) {
    current = await skill.run(ctx, current);
  }
  return current;
}
