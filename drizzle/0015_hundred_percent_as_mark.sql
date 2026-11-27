-- «100%» como marca de «Completado» y el color de «Lo probé» (04-importacion, design.md §23). SQL a mano aprobado.

-- Los juegos en el estado «100%» pasan a «Completado» con la marca. status_since no cambia.
update "library_game" as "lg" set "status_id" = "completed"."id", "hundred_percent" = true
from "status" as "hundred"
join "status" as "completed"
  on "completed"."user_id" = "hundred"."user_id" and "completed"."system_key" = 'completed'
where "hundred"."system_key" = 'hundred_percent' and "lg"."status_id" = "hundred"."id";--> statement-breakpoint

-- El diario deja de nombrar «100%»: sus registros pasan a nombrar «Completado».
update "journal_entry" as "je" set "from_status_id" = "completed"."id"
from "status" as "hundred"
join "status" as "completed"
  on "completed"."user_id" = "hundred"."user_id" and "completed"."system_key" = 'completed'
where "hundred"."system_key" = 'hundred_percent' and "je"."from_status_id" = "hundred"."id";--> statement-breakpoint

update "journal_entry" as "je" set "to_status_id" = "completed"."id"
from "status" as "hundred"
join "status" as "completed"
  on "completed"."user_id" = "hundred"."user_id" and "completed"."system_key" = 'completed'
where "hundred"."system_key" = 'hundred_percent' and "je"."to_status_id" = "hundred"."id";--> statement-breakpoint

-- Un registro entre «Completado» y «100%» quedó de «Completado» a «Completado»: no es un cambio.
delete from "journal_entry" where "from_status_id" = "to_status_id";--> statement-breakpoint

-- Las respuestas de las revisiones abiertas que eligieron «100%».
update "import_entry" as "ie" set "status_id" = "completed"."id"
from "status" as "hundred"
join "status" as "completed"
  on "completed"."user_id" = "hundred"."user_id" and "completed"."system_key" = 'completed'
where "hundred"."system_key" = 'hundred_percent' and "ie"."status_id" = "hundred"."id";--> statement-breakpoint

delete from "status" where "system_key" = 'hundred_percent';--> statement-breakpoint

-- «Lo probé» pasa a violeta si el usuario no le cambió el color (hasta la 07 no se puede).
update "status" set "color" = 'violet' where "system_key" = 'tried' and "color" = 'coral';--> statement-breakpoint

-- «Jugado» queda segundo en Terminado, donde estaba «100%».
update "status" set "position" = 2 where "system_key" = 'played' and "position" = 3;
