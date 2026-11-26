-- Paso a los estados nuevos (04-importacion, design.md §21). SQL a mano aprobado: drizzle-kit no migra datos.

-- «Pendiente» pasa a «Backlog». Si el usuario lo renombró, conserva su nombre.
update "status" set "name" = 'Backlog'
where "system_key" = 'backlog' and "name" = 'Pendiente';--> statement-breakpoint

-- Los juegos en el estado «Sin fin» pasan a «Jugado» con la marca sin fin. status_since no cambia.
update "library_game" as "lg" set "status_id" = "played"."id", "endless" = true
from "status" as "endless_status"
join "status" as "played"
  on "played"."user_id" = "endless_status"."user_id" and "played"."system_key" = 'played'
where "endless_status"."system_key" = 'endless' and "lg"."status_id" = "endless_status"."id";--> statement-breakpoint

-- El diario deja de nombrar «Sin fin»: sus registros pasan a nombrar «Jugado».
update "journal_entry" as "je" set "from_status_id" = "played"."id"
from "status" as "endless_status"
join "status" as "played"
  on "played"."user_id" = "endless_status"."user_id" and "played"."system_key" = 'played'
where "endless_status"."system_key" = 'endless' and "je"."from_status_id" = "endless_status"."id";--> statement-breakpoint

update "journal_entry" as "je" set "to_status_id" = "played"."id"
from "status" as "endless_status"
join "status" as "played"
  on "played"."user_id" = "endless_status"."user_id" and "played"."system_key" = 'played'
where "endless_status"."system_key" = 'endless' and "je"."to_status_id" = "endless_status"."id";--> statement-breakpoint

-- Un registro entre «Sin fin» y «Jugado» quedó de «Jugado» a «Jugado»: no es un cambio.
delete from "journal_entry" where "from_status_id" = "to_status_id";--> statement-breakpoint

-- Las respuestas de las revisiones abiertas: del system_key al id del estado del usuario.
update "import_entry" as "ie" set "status_id" = "s"."id"
from "status" as "s"
where "s"."user_id" = "ie"."user_id" and "s"."system_key" = "ie"."status_key"
  and "ie"."status_key" <> 'endless';--> statement-breakpoint

update "import_entry" as "ie" set "status_id" = "played"."id", "endless_answer" = true
from "status" as "played"
where "played"."user_id" = "ie"."user_id" and "played"."system_key" = 'played'
  and "ie"."status_key" = 'endless';--> statement-breakpoint

alter type "public"."import_play_answer" rename value 'not_interested' to 'hidden';--> statement-breakpoint

-- Sin juegos, registros ni respuestas que lo nombren, el estado «Sin fin» deja de existir.
delete from "status" where "system_key" = 'endless';
